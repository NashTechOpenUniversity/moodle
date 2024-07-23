<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

namespace mod_quiz\output;

use mod_quiz\structure;
use renderable;
use renderer_base;
use templatable;

/**
 * Renderer outputting the quiz editing UI.
 *
 * @package   mod_quiz
 * @category  output
 * @copyright 2024 The Open University
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class edit_page implements renderable, templatable {

    /**
     * Constructor.
     *
     * @param structure $structure object containing the structure of the quiz.
     * @param \moodle_url $pageurl the canonical URL of this page.
     * @param \mod_quiz\quiz_settings $quizobj object containing all the quiz settings information.
     * @param \core_question\local\bank\question_edit_contexts $contexts the relevant question bank contexts.
     * @param array $pagevars the variables from question_edit_setup.
     */
    public function __construct(
        /** @var structure object containing the structure of the quiz. */
        protected readonly structure $structure,
        /** @var \moodle_url the canonical URL of this page. */
        protected readonly \moodle_url $pageurl,
        /** @var \mod_quiz\quiz_settings object containing all the quiz settings information. */
        protected readonly \mod_quiz\quiz_settings $quizobj,
        /** @var \core_question\local\bank\question_edit_contexts the relevant question bank contexts. */
        protected readonly \core_question\local\bank\question_edit_contexts $contexts,
        /** @var array the variables from  question_edit_setup. */
        protected readonly array $pagevars,
    ) {
    }

    /**
     * Export items to be rendered with a template.
     *
     * @param renderer_base $output The renderer.
     * @return array An array of value for template.
     */
    public function export_for_template(renderer_base $output): array {
        global $PAGE, $OUTPUT;
        /** @var edit_renderer $editrenderer */
        $editrenderer = $PAGE->get_renderer('mod_quiz', 'edit');

        $data = [];
        // Add heading.
        $heading = $OUTPUT->heading(get_string('questions', 'quiz'));
        $data['heading'] = $heading;

        // Add quiz warning.
        $data['warnings'] = $editrenderer->quiz_state_warnings($this->structure);

        // Add quiz information.
        [$currentstatus, $explanation] = $this->structure->get_dates_summary();
        $quesitoncount = $this->structure->get_question_count();
        $data['currentstatus'] = $currentstatus;
        $data['explanation'] = $explanation;
        $data['quesitoncount'] = $quesitoncount;

        // Add maximum grade input.
        $data['hiddenparam'] = \html_writer::input_hidden_params($this->pageurl);
        $data['size'] = $this->structure->get_decimal_places_for_grades() + 2;
        $data['value'] = $this->structure->formatted_quiz_grade();
        $data['sesskey'] = sesskey();

        // Add repaginate button.
        $data['repaginatebutton'] = $editrenderer->repaginate_button($this->structure, $this->pageurl);

        // Add select multiple button.
        $data['selectmultiplebutton'] = $editrenderer->selectmultiple_button($this->structure);

        // Add total marks.
        $data['totalmark'] = $editrenderer->total_marks($this->quizobj->get_quiz());

        // Add select multiple controls.
        $data['selectmultiplecontrols'] = $editrenderer->selectmultiple_controls($this->structure);

        // Section list class.
        $data['sectionlistclass'] = 'slots';
        if ($this->structure->get_section_count() == 1) {
            $data['sectionlistclass'] .= ' only-one-section';
        }

        // Add sections.
        $sections = [];
        foreach ($this->structure->get_sections() as $section) {
            $sectionstyle = '';
            if ($this->structure->is_only_one_slot_in_section($section)) {
                $sectionstyle .= ' only-has-one-slot';
            }
            if ($section->shufflequestions) {
                $sectionstyle .= ' shuffled';
            }

            $sectiondata['sectionstyle'] = $sectionstyle;

            if ($section->heading) {
                $sectiondata['sectionheadingclass'] = 'instancesection';
                $sectiondata['sectionheadingtext'] = format_string($section->heading);
            } else {
                // Use a sr-only default section heading, so we don't end up with an empty section heading.
                $sectiondata['sectionheadingclass'] = 'instancesection sr-only';
                $sectiondata['sectionheadingtext'] = get_string('sectionnoname', 'quiz');
            }

            $sectiondata['editsectionheadingicon'] = false;
            if ($this->structure->can_be_edited()) {
                $sectiondata['editsectionheadingicon'] = true;
            }
            $sectiondata['removeicon'] = false;
            if (!$this->structure->is_first_section($section) && $this->structure->can_be_edited()) {
                $sectiondata['removeicon'] = true;
                $sectiondata['removeicontitle'] = get_string('sectionheadingremove', 'quiz', format_string($section->heading));
                $sectiondata['removeiconurl'] = new \moodle_url('/mod/quiz/edit.php',
                    ['sesskey' => sesskey(), 'removesection' => '1', 'sectionid' => $section->id]);
            }
            $sectiondata['sectionid'] = $section->id;

            // Add shuffle question.
            $sectiondata['shufflequestion'] = $editrenderer->section_shuffle_questions($this->structure, $section);

            // Add questions to sections.
            $sectiondata['questions'] = '';
            foreach ($this->structure->get_slots_in_section($section->id) as $slot) {
                $sectiondata['questions'] .= $editrenderer->question_row($this->structure, $slot, $this->contexts,
                    $this->pagevars, $this->pageurl);
            }

            // Add last section.
            $sectiondata['lastsection'] = false;
            if ($this->structure->is_last_section($section)) {
                $sectiondata['lastsection'] = true;
                $sectiondata['lastsectionmenu'] = $editrenderer->add_menu_actions($this->structure, 0,
                    $this->pageurl, $this->contexts, $this->pagevars);
            }

            $sections[] = $sectiondata;
        }
        $data['section'] = $sections;

        // Initialize javascript.
        $editrenderer->initialise_editing_javascript($this->structure);

        // Include the contents of any other popups required.
        if ($this->structure->can_be_edited()) {
            $thiscontext = $this->contexts->lowest();
            $PAGE->requires->js_call_amd('mod_quiz/modal_quiz_question_bank', 'init', [
                $thiscontext->id,
                $this->quizobj->get_cm()->id,
                $this->quizobj->get_cm()->id,
            ]);

            $PAGE->requires->js_call_amd('mod_quiz/modal_add_random_question', 'init', [
                $thiscontext->id,
                $this->quizobj->get_cm()->id,
                $this->pagevars['cat'],
                $this->pageurl->out_as_local_url(true),
                $this->pageurl->param('cmid'),
                \core\plugininfo\qbank::is_plugin_enabled(\qbank_managecategories\helper::PLUGINNAME),
            ]);

            // Include the question chooser.
            $data['questionchooser'] = $editrenderer->question_chooser();
        }

        // Bring the config data to the renderer to set it as an attribute element,
        // thus avoiding warning messages due to passing too much data through JavaScript.
        $config = new \stdClass();
        $config->questiondecimalpoints = $this->structure->get_decimal_places_for_question_marks();
        $config->pagehtml = $editrenderer->new_page_template($this->structure, $this->contexts, $this->pagevars,
            $this->pageurl);
        $config->addpageiconhtml = $editrenderer->add_page_icon_template($this->structure);
        $data['configdata'] = json_encode($config);
        $data['langstring'] = json_encode([
            'question' => get_string('question', 'moodle'),
            'page' => get_string('page', 'moodle'),
        ]);

        return $data;
    }
}
