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

namespace core\output;

use moodle_url;
use context;

/**
 * This class sets a general initial bar on the action bar menu.
 *
 * @package    core
 * @category   output
 * @copyright 2024 The Open University
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class initials_bar {

    /**
     * Retrieve the initials selector data before render.
     *
     * @param \stdClass $course The course object.
     * @param context $context The context object.
     * @param string $slug The slug url.
     * @param array $params URL params array.
     * @param \stdClass $filter Filter object to support initials selector js.
     * @param string $reportmode Report type.
     * @param int|null $cmid Cmid data.
     * @return comboboxsearch The raw HTML to render.
     */
    public static function initials_selector(\stdClass $course, context $context, string $slug,
            array $params, \stdClass $filter, string $reportmode = 'grade', int $cmid = null): comboboxsearch {
        global $SESSION, $OUTPUT, $PAGE;
        // User search.
        $url = new moodle_url($slug, $params);

        $renderer = $PAGE->get_renderer('core_user');
        $prefix = 'si';
        if ($reportmode !== 'grade') {
            // To reuse existing filter feature of flex table.
            $prefix = 'ti';
        }
        $firstinitial = $SESSION->{$reportmode . 'report'}["filterfirstname-{$context->id}"] ?? '';
        $lastinitial  = $SESSION->{$reportmode . 'report'}["filtersurname-{$context->id}"] ?? '';
        $initialsbar = $renderer->partial_user_search($url, $firstinitial, $lastinitial, true, $prefix);

        $currentfilter = '';
        if ($firstinitial !== '' && $lastinitial !== '') {
            $currentfilter = get_string('filterbothactive', 'grades',
                ['first' => $firstinitial, 'last' => $lastinitial]);
        } elseif ($firstinitial !== '') {
            $currentfilter = get_string('filterfirstactive', 'grades', ['first' => $firstinitial]);
        } elseif ($lastinitial !== '') {
            $currentfilter = get_string('filterlastactive', 'grades', ['last' => $lastinitial]);
        }

        $PAGE->requires->js_call_amd('core/searchwidget/initials', 'init',
            [$slug, $filter->userid, $filter->usersearch, $reportmode, $params]);

        $formdata = (object) [
            'courseid' => $course->id,
            'cmid' => $cmid,
            'initialsbars' => $initialsbar,
        ];
        $dropdowncontent = $OUTPUT->render_from_template('core/initials_dropdown_form', $formdata);

        $buttoncontent = $currentfilter !== '' ? $currentfilter : get_string('filterbyname', 'core_grades');
        $buttonheader = $currentfilter !== '' ? get_string('name') : null;

        return new comboboxsearch(false, $buttoncontent, $dropdowncontent,
            'initials-selector', 'initialswidget', 'initialsdropdown', $buttonheader);
    }

    /**
     * Renders the group selector trigger element.
     *
     * @param \stdClass $course The course object.
     * @param \core_grades_renderer $output Output object.
     * @param string|null $groupactionbaseurl The base URL for the group action.
     * @param \cm_info|null $cm cm info object.
     * @return string|null The raw HTML to render.
     */
    public static function group_selector(\stdClass $course, \core_grades_renderer $output,
            ?string $groupactionbaseurl = null, \cm_info $cm = null): ?string {

        // Make sure that group mode is enabled.
        if (!$groupmode = $course->groupmode) {
            return null;
        }

        if (!is_null($cm) && !groups_get_activity_groupmode($cm)) {
            return null;
        }

        $sbody = $output->render_from_template('core_group/comboboxsearch/searchbody', [
            'courseid' => $course->id,
            'cmid' => $cm->id ?? null,
            'currentvalue' => optional_param('groupsearchvalue', '', PARAM_NOTAGS),
        ]);

        $label = $groupmode == VISIBLEGROUPS ? get_string('selectgroupsvisible') :
            get_string('selectgroupsseparate');

        $data = [
            'name' => 'group',
            'label' => $label,
            'courseid' => $course->id,
            'groupactionbaseurl' => $groupactionbaseurl
        ];

        [$context, $activegroup] = self::get_group_info($course, $cm, $groupmode);

        $data['group'] = $activegroup;

        if ($activegroup) {
            $group = groups_get_group($activegroup);
            $data['selectedgroup'] = format_string($group->name, true, ['context' => $context]);
        } elseif ($activegroup === 0) {
            $data['selectedgroup'] = get_string('allparticipants');
        }

        $groupdropdown = new comboboxsearch(
            false,
            $output->render_from_template('core_group/comboboxsearch/group_selector', $data),
            $sbody,
            'group-search',
            'groupsearchwidget',
            'groupsearchdropdown overflow-auto w-100',
        );

        return $output->render_from_template($groupdropdown->get_template(),
            $groupdropdown->export_for_template($output));
    }

    /**
     * Retrieve group info contains context (course or module) and group active.
     *
     * @param \stdClass $course The course object.
     * @param null|\cm_info $cm Course module info.
     * @param int $groupmode Group mode data.
     * @return array Group info data context (course or module) and group active.
     */
    private static function get_group_info(\stdClass $course, ?\cm_info $cm, int $groupmode): array {
        global $USER;

        // Determine the context based on $cm
        if (is_null($cm)) {
            $context = \context_course::instance($course->id);
        } else {
            $context = \context_module::instance($cm->id);
        }

        // Check if the user can access all groups
        $canaccessallgroups = has_capability('moodle/site:accessallgroups', $context);
        $groupingid = ($cm === null) ? $course->defaultgroupingid : $cm->groupingid;

        // Determine the allowed groups based on $cm and $groupmode
        if ($groupmode == VISIBLEGROUPS || $canaccessallgroups) {
            $allowedgroups = groups_get_all_groups($course->id, 0, $groupingid, 'g.*', false, !is_null($cm));
        } else {
            $allowedgroups = groups_get_all_groups($cm->course, $USER->id, $groupingid, 'g.*', false, !is_null($cm));
        }

        // Determine the active group based on $cm
        if (is_null($cm)) {
            $activegroup = groups_get_course_group($course, true, $allowedgroups);
        } else {
            $activegroup = groups_get_activity_group($cm, true, $allowedgroups);
        }

        return [$context, $activegroup];
    }
}
