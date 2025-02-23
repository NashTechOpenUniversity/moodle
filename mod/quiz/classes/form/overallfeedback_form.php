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

/**
 * Defines the editing form for overall feedbacks.
 *
 * @package    mod_quiz
 * @copyright  2024 The Open University
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace mod_quiz\form;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot.'/lib/formslib.php');

/**
 * Class overallfeedback_form.
 *
 * @package    mod_quiz
 * @copyright  2024 The Open University
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class overallfeedback_form extends \moodleform {

    /**
     * Form definiton.
     */
    public function definition() {
        global $OUTPUT;
        $mform = $this->_form;
        $customdata = $this->_customdata;
        $context = $customdata['context'];
        $feedbacks = $customdata['feedbacks'] ?? [];
        $gradeitemid = $customdata['gradeItemId'];
        $mform->addElement('static', 'boundary_header', get_string('gradeboundary', 'quiz'));
        // Add the feedback form for the 100% boundary separately, as its UI differs from that of other feedback forms.
        // The others will be rendered later.
        $mform->addElement('static', 'gradeboundarystatic1',
            get_string('overallfeedback_lessthanequal', 'quiz'), '100%');
        $elements = [];
        $elements[] = $mform->createElement('editor',
            "feedbacktext[0][$gradeitemid]", get_string('feedback', 'quiz'), ['rows' => 3],
            ['maxfiles' => EDITOR_UNLIMITED_FILES, 'noclean' => true,
                'context' => $context]);
        // Add a delete button, but keep it disabled and hidden for placeholder purposes only.
        $elements[] = $mform->createElement('button', 'delete-feedback',
            $OUTPUT->pix_icon('t/delete', get_string('delete'), 'core'),
            ['class' => 'invisible', 'disabled' => true]);
        $mform->addGroup($elements, 'gradeitem-feedback',
            get_string('feedback', 'quiz'), ' ', false);

        $dividertemplate = $OUTPUT->render_from_template('mod_quiz/divider_feedback', ['afterindex' => 0]);
        $mform->addElement('html', $dividertemplate);

        // Add the feedback form for the other boundaries.
        $index = 0;
        foreach ($feedbacks as $feedback) {
            // The feedback form for the 100% boundary has already been added, so we will skip adding it again here.
            if ($feedback->maxgrade > 1) {
                continue;
            }
            $mform->addElement('text', "feedbackboundaries[$index]",
                get_string('overallfeedback_lessthan', 'quiz'), ['size' => 10]);
            $elements = [];
            $elements[] = $mform->createElement('editor',
                'feedbacktext[' . ($index + 1) . '][' . $gradeitemid . ']',
                get_string('feedback', 'quiz'), ['rows' => 3],
                ['maxfiles' => EDITOR_UNLIMITED_FILES, 'noclean' => true,
                    'context' => $context]);
            $elements[] = $mform->createElement('button', 'delete-feedback',
                $OUTPUT->pix_icon('t/delete', get_string('delete'), 'core'));
            $mform->addGroup($elements, 'gradeitem-feedback', get_string('feedback', 'quiz'), ' ', false);
            $dividertemplate = $OUTPUT->render_from_template('mod_quiz/divider_feedback', ['afterindex' => $index + 1]);
            $mform->addElement('html', $dividertemplate);
            $index++;
        }
    }

    #[\Override]
    public function set_data($defaultvalues) {
        if (is_object($defaultvalues)) {
            $defaultvalues = (array) $defaultvalues;
        }

        $this->data_preprocessing($defaultvalues);
        parent::set_data($defaultvalues);
    }

    /**
     * Process the data and set it to the form before rendering the form data.
     *
     * @param array $toform The form data to be processed.
     */
    public function data_preprocessing(array &$toform) {
        $feedbacks = $this->_customdata['feedbacks'];
        if (count($feedbacks)) {
            $key = 0;
            // Retrieve the first feedback entry for check.
            $firstfeedback = reset($feedbacks);
            if ($firstfeedback->maxgrade < 1) {
                // This means the feedback for the boundary 100% is not filled.
                // Therefore, we need to add a default feedback for the boundary 100%.
                // No need to worry; this is just the default data used to support the display of the feedback form.
                $a = new \stdClass();
                $a->id = $firstfeedback->id - 1;
                $a->quizid = $firstfeedback->quizid;
                $a->gradeitemid = $firstfeedback->gradeitemid;
                $a->feedbacktext = '';
                $a->mingrade = $firstfeedback->maxgrade;
                $a->maxgrade = 1;
                $a->feedbacktextformat = $firstfeedback->feedbacktextformat;
                // Add back to the feedback list to ensure the feedback for a grade of 100% is always visible in the list.
                // This step is necessary because feedback for a grade of 100% is not stored in the database when it's empty.
                array_unshift($feedbacks, $a);
            }
            foreach ($feedbacks as $feedback) {
                $feedbackname = "feedbacktext[$key][$feedback->gradeitemid]";
                $draftid = file_get_submitted_draft_itemid($feedbackname);
                $toform[$feedbackname]['text'] = file_prepare_draft_area(
                    $draftid,
                    $this->_customdata['context']->id,
                    'mod_quiz',
                    'grade_item_feedback',
                    !empty($feedback->id) ? (int) $feedback->id : null,
                    null,
                    $feedback->feedbacktext,
                );
                $toform[$feedbackname]['format'] = $feedback->feedbacktextformat;
                $toform[$feedbackname]['itemid'] = $draftid;

                if ($feedback->mingrade > 0) {
                    // The mingrade/maxgrade values are stored as float numbers less than or equal to 1,
                    // representing the percentage boundaries.
                    // For example, a 50% boundary is stored as 0.5. Here, we will convert these values
                    // from 0.5 to 50% for display purposes.
                    $toform['feedbackboundaries['.$key.']'] =
                        round(100.0 * $feedback->mingrade, 6) . '%';
                }
                $key++;
            }
        }
    }

    #[\Override]
    public function validation($data, $files) {
        $errors = parent::validation($data, $files);
        $grade = $data['grade'];
        $formdata = $data['formdata'];
        // Store all valid boundary data to validate against user-entered duplicate boundaries.
        $boundaries = [];

        foreach ($formdata as $key => &$data) {
            $boundary = trim($data->boundary);
            if (empty($boundary)) {
                // Skip processing if boundary data is not entered and feedback is also empty.
                // If feedback data is entered without boundary data, an error will be displayed.
                if (!empty($data->feedback->text) && trim($data->feedback->text) != '') {
                    $errors['feedbacktext[' . ($key + 1) . ']'] =
                        get_string('feedbackerrorjunkinfeedback', 'quiz', $key + 1);
                }
                continue;
            }

            if (strlen($boundary) > 0) {
                // We accept boundary input in two formats, e.g., "10%" or "100".
                // For the "n%" format, we remove the '%' and divide by 100 to convert it to a decimal.
                // For the other format, we divide the input by the grade number to calculate the percentage as a decimal.
                if ($boundary[strlen($boundary) - 1] == '%') {
                    // User enters the boundary in the "n%" format, we remove the "%" to extract the numeric value.
                    $boundary = trim(substr($boundary, 0, -1));
                    if (is_numeric($boundary)) {
                        // Divide by 100 to convert it to a decimal. We will use this number
                        // for validation and store it if it's valid.
                        $boundary = $boundary / 100;
                    } else {
                        // This is not the actual number.
                        $errors["feedbackboundaries[$key]"] =
                            get_string('feedbackerrorboundaryformat', 'quiz', $key + 1);
                    }
                } else if (!is_numeric($boundary)) {
                    // This is not the actual number.
                    $errors["feedbackboundaries[$key]"] =
                        get_string('feedbackerrorboundaryformat', 'quiz', $key + 1);
                } else {
                    // In this case, the user doesn't enter the boundary data in the "n%" format,
                    // so we can divide by 100 to convert it to a decimal.
                    $boundary = $boundary / $grade;
                }
            }
            // Check if the user entered a boundary that is too high (>= 100%) or too low (<= 0%).
            if (is_numeric($boundary) && $boundary <= 0 || $boundary >= 1) {
                $errors["feedbackboundaries[$key]"] =
                    get_string('feedbackerrorboundaryoutofrange', 'quiz', $key + 1);
            }
            // Final step to verify the boundary data, ensuring it hasn't been entered before.
            if (in_array($boundary, $boundaries)) {
                $errors["feedbackboundaries[$key]"] = get_string('feedbackerroruniqueinboundary', 'quiz', $key + 1);
            } else {
                $boundaries[] = $boundary;
                $data->boundary = $boundary;
            }
        }

        return [$errors, $formdata];
    }
}
