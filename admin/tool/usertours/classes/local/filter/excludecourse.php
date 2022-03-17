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
 * Exclude course filter.
 *
 * @package tool_usertours
 * @copyright 2022 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class excludecourse extends course {
    /**
     * The name of the filter.
     *
     * @return string
     */
    public static function get_filter_name(): string {
        return 'excludecourse';
    }

    /**
     * Check whether the filter matches the specified tour and/or context.
     *
     * @param tour $tour The tour to check
     * @param context $context The context to check
     * @return boolean
     */
    public static function filter_matches(tour $tour, context $context): bool {
        global $COURSE;
        $values = $tour->get_filter_values(self::get_filter_name());
        if (empty($values) || empty($values[0])) {
            // There are no values configured, meaning exclude none.
            return true;
        }
        // If the page is not within a course, then it can't be in one of the courses we are excluding.
        if (empty($COURSE->id)) {
            return true;
        }
        return !in_array($COURSE->id, $values);
    }
}
