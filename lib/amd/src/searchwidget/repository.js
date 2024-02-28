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
 * A repo for the search partial in the grader report.
 *
 * @module    core/searchwidget/repository
 * @copyright 2022 Mathew May <mathew.solutions>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import ajax from 'core/ajax';

/**
 * Given params, we want to fetch the learners within this report.
 *
 * @method userFetch
 * @param {object} params ID of the course to fetch the users of.
 * @param {string} service Service name for each request.
 * @return {object} jQuery promise
 */
export const userFetch = (params, service = 'gradereport_grader_get_users_in_report') => {
    const request = {
        methodname: service,
        args: params,
    };
    return ajax.call([request])[0];
};