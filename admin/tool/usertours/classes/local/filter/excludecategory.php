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

namespace tool_usertours\local\filter;

use tool_usertours\tour;
use context;

/**
 * Exclude category filter.
 *
 * @package tool_usertours
 * @copyright 2022 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class excludecategory extends category {
    /**
     * Indicates that the user is not excluding any categories.
     */
    const NONE = 0;

    /**
     * The name of the filter.
     *
     * @return string
     */
    public static function get_filter_name(): string {
        return 'excludecategory';
    }

    /**
     * Overrides the base prepare the filter values for the form
     *
     * @param \MoodleQuickForm $mform The form to add filter settings to.
     * @throws \coding_exception
     */
    public static function add_filter_to_form(\MoodleQuickForm &$mform) {
        $options = [
            static::NONE => get_string('none'),
        ];
        $options += static::get_filter_options();

        $filtername = static::get_filter_name();
        $key = "filter_{$filtername}";

        $mform->addElement('select', $key, get_string($key, 'tool_usertours'), $options, [
                'multiple' => true,
        ]);
        $mform->setDefault($key, static::NONE);
        $mform->addHelpButton($key, $key, 'tool_usertours');
    }

    /**
     * Overrides the base prepare the filter values for the form.
     *
     * @param tour $tour The tour to prepare values from
     * @param \stdClass $data The data value
     * @return \stdClass
     */
    public static function prepare_filter_values_for_form(tour $tour, \stdClass $data): \stdClass {
        $filtername = static::get_filter_name();

        $key = "filter_{$filtername}";
        $values = $tour->get_filter_values($filtername);
        if (empty($values)) {
            $values = static::NONE;
        }
        $data->$key = $values;

        return $data;
    }

    /**
     * Check whether the filter matches the specified tour and/or context.
     *
     * @param tour $tour The tour to check
     * @param context $context The context to check
     * @return boolean
     */
    public static function filter_matches(tour $tour, context $context): bool {
        $values = $tour->get_filter_values(self::get_filter_name());

        if (empty($values) || empty($values[0])) {
            // There are no values configured, meaning exclude none.
            return true;
        }
        if ($context->contextlevel < CONTEXT_COURSECAT) {
            // Page is not within any category so it can't be in an excluded category.
            return true;
        }
        return self::check_contexts($context, $values);
    }

    /**
     * Recursive function allows checking of parent categories.
     *
     * @param context $context
     * @param array $values
     * @return boolean
     */
    private static function check_contexts(context $context, $values): bool {
        if ($context->contextlevel > CONTEXT_COURSECAT) {
            return self::check_contexts($context->get_parent_context(), $values);
        } else if ($context->contextlevel == CONTEXT_COURSECAT) {
            if (in_array($context->instanceid, $values)) {
                return false;
            } else {
                return self::check_contexts($context->get_parent_context(), $values);
            }
        } else {
            return true;
        }
    }

    /**
     * Save the filter values from the form to the tour.
     *
     * @param tour $tour The tour to save values to
     * @param \stdClass $data The data submitted in the form
     */
    public static function save_filter_values_from_form(tour $tour, \stdClass $data) {
        $filtername = static::get_filter_name();

        $key = "filter_{$filtername}";

        $newvalue = $data->$key;
        foreach ($data->$key as $value) {
            if ($value === static::NONE) {
                $newvalue = [];
                break;
            }
        }

        $tour->set_filter_values($filtername, $newvalue);
    }
}
