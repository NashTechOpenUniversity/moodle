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

use core\output\comboboxsearch;
use mod_quiz\local\reports\attempts_report_options;
use moodle_url;

/**
 * Renderable class for the action bar in the quiz report pages.
 *
 * @package    mod_quiz
 * @copyright  2024 The Open University
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class action_bar extends \core_grades\output\action_bar {

    /** @var string $usersearch The content that the current user is looking for. */
    protected string $usersearch = '';
    /** @var string $userid The userid of the current user is looking for. */
    protected string $userid = '';
    /** @var string $reportmode The quiz report mode. */
    protected string $reportmode;
    /** @var attempts_report_options $options the current report settings. */
    protected object $options;
    /** @var object $table The table class for each report type. */
    protected object $table;
    /** @var string|null $tifirst The firstname filter letter */
    protected ?string $tifirst;
    /** @var string|null $tilast The surname filter letter. */
    protected ?string $tilast;
    /** @var int $tilast The reset table status. */
    protected int $treset;

    /**
     * The class constructor.
     *
     * @param \context $context The context object.
     * @param attempts_report_options $options The current report settings.
     * @param string $reportmode The quiz report type.
     * @param ?object $table The table class for each report type.
     */
    public function __construct(\context $context, attempts_report_options $options,
            string $reportmode = 'grader', ?object $table = null) {
        global $SESSION;
        parent::__construct($context);
        if (!is_null($table)) {
            $this->table = $table;
        }
        $this->usersearch = optional_param('gpr_search', '', PARAM_NOTAGS);
        $this->userid = optional_param('gpr_userid', '', PARAM_INT);
        $this->tifirst = optional_param('tifirst', null, PARAM_RAW);
        $this->tilast = optional_param('tilast', null, PARAM_RAW);
        $this->treset = optional_param('treset', 0, PARAM_INT);

        // Set up for the new initial bar filter.
        if (!is_null($this->tifirst) && ($this->tifirst === '' ||
                str_contains(get_string('alphabet', 'langconfig'), $this->tifirst))) {
            $SESSION->{$reportmode . 'report'}["filterfirstname-{$context->id}"] = $this->tifirst;
        }
        if (!is_null($this->tilast) && ($this->tilast === '' ||
                str_contains(get_string('alphabet', 'langconfig'), $this->tilast))) {
            $SESSION->{$reportmode . 'report'}["filtersurname-{$context->id}"] = $this->tilast;
        }
        // Reset initials filter.
        if ($this->treset === 1) {
            $SESSION->{$reportmode . 'report'}["filterfirstname-{$context->id}"] = '';
            $SESSION->{$reportmode . 'report'}["filtersurname-{$context->id}"] = '';
        }
        $this->reportmode = $reportmode;
        $this->options = $options;
    }

    /**
     * Returns the template for the action bar.
     *
     * @return string
     */
    public function get_template(): string {
        return 'gradereport_grader/action_bar';
    }

    /**
     * Export the data for the mustache template.
     *
     * @param \renderer_base $output renderer to be used to render the action bar elements.
     * @return array
     * @throws \moodle_exception
     */
    public function export_for_template(\renderer_base $output): array {
        global $OUTPUT, $USER;
        $cmid = $this->context->instanceid;
        $cm = $this->options->cm;
        $course = $cm->get_course();
        // Get the data used to output the general navigation selector.
        $generalnavselector = new general_action_bar($this->context, $this->options);
        $data = $generalnavselector->export_for_template($output);
        // Prepare url param.
        $url = $this->options->get_url();
        $urlparam = $url->params();
        // Set up data for initials bar.
        $filter = new \stdClass();
        $filter->usersearch = $this->usersearch;
        $filter->userid = $this->userid;
        $initialselector = \core\output\initials_bar::initials_selector(
            $course,
            $this->context,
            '/mod/quiz/report.php',
            $urlparam,
            $filter,
            $this->reportmode,
            $cmid,
        );
        $data['initialselector'] = $initialselector->export_for_template($output);
        // Set up data for group selector.
        $data['groupselector'] = \core\output\initials_bar::group_selector($cm->get_course(),
            $output, $this->options->get_url(), $cm);
        $courseid = $cm->course;
        // Reset link.
        $resetlink = new moodle_url('/mod/quiz/report.php', ['id' => $cm->id, 'mode' => $this->reportmode]);
        // User search.
        $searchinput = $OUTPUT->render_from_template('core_user/comboboxsearch/user_selector', [
            'currentvalue' => $this->usersearch,
            'courseid' => $courseid,
            'resetlink' => $resetlink->out(false),
            'group' => 0,
        ]);
        $searchdropdown = new comboboxsearch(
            true,
            $searchinput,
            null,
            'user-search dropdown d-flex',
            null,
            'usersearchdropdown overflow-auto',
            null,
            false,
        );
        $data['searchdropdown'] = $searchdropdown->export_for_template($output);

        if ($course->groupmode == VISIBLEGROUPS || has_capability('moodle/site:accessallgroups', $this->context)) {
            $allowedgroups = groups_get_all_groups($course->id, 0, $course->defaultgroupingid);
        } else {
            $allowedgroups = groups_get_all_groups($course->id, $USER->id, $course->defaultgroupingid);
        }

        if (!empty($this->tifirst) || !empty($this->tilast) ||
                groups_get_course_group($course, true, $allowedgroups) ||
                $this->usersearch
        ) {
            $resetparam = array_merge($this->options->get_url()->params(), [
                'group' => 0,
                'tifirst' => '',
                'tilast' => ''
            ]);

            $reset = new moodle_url('/mod/quiz/report.php', $resetparam);
            $data['pagereset'] = $reset->out(false);
        }

        return $data;
    }
}
