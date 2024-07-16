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

namespace mod_quiz\external;

use coding_exception;
use core_external\external_api;
use core_external\external_description;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use core_external\external_warnings;
use mod_quiz\quiz_attempt;
use mod_quiz\quiz_settings;
use moodle_exception;
use stdClass;

/**
 * Validate overall feedback for each grade item form.
 *
 * @package   mod_quiz
 * @copyright 2024 The Open University
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class validate_overall_feedback_per_grade_item extends external_api {

    /**
     * Declare the method parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'quizid' => new external_value(PARAM_INT, 'The quiz to update slots for.'),
            'formdata' => new external_value(PARAM_RAW, 'The form data to create overall feedback per grade item.'),
        ]);
    }

    /**
     * For quiz with grade items already set up, validate the form data in the correct format before creating it.
     *
     * @param int $quizid the id of the quiz to validate feedback.
     * @param string $formdata Form data needs to be validated before creating.
     * @return stdClass validation result info.
     */
    public static function execute(int $quizid, string $formdata): stdClass {
        global $DB;

        $params = external_api::validate_parameters(self::execute_parameters(), [
            'formdata' => $formdata,
            'quizid' => $quizid,
        ]);

        $formdata = json_decode($params['formdata']);

        $result = (object) [
            'isvalid' => true,
            'errors' => '',
            'warnings' => [],
        ];

        $errors = [];

        $quizobj = quiz_settings::create($quizid);
        $grade = $quizobj->get_quiz()->grade;
        $index = 0;
        foreach ($formdata as $key => &$data) {
            $boundary = trim($data->boundary);
            if (empty($boundary)) {
                break;
            }

            if (strlen($boundary) > 0) {
                if ($boundary[strlen($boundary) - 1] == '%') {
                    $boundary = trim(substr($boundary, 0, -1));
                    if (is_numeric($boundary)) {
                        $boundary = $boundary * $grade / 100.0;
                    } else {
                        $errors["feedbackboundaries[$key]"] =
                            get_string('feedbackerrorboundaryformat', 'quiz', $key + 1);
                    }
                } else if (!is_numeric($boundary)) {
                    $errors["feedbackboundaries[$key]"] =
                        get_string('feedbackerrorboundaryformat', 'quiz', $key + 1);
                }
            }
            if (is_numeric($boundary) && $boundary <= 0 || $boundary >= $grade ) {
                $errors["feedbackboundaries[$key]"] =
                    get_string('feedbackerrorboundaryoutofrange', 'quiz', $key + 1);
            }
            if (is_numeric($boundary) && $key > 0 && $boundary >= $formdata[$key - 1]->boundary) {
                $errors["feedbackboundaries[$key]"] =
                    get_string('feedbackerrororder', 'quiz', $key + 1);
            }
            $data->boundary = $boundary;
            $index++;
        }
        $numboundaries = $index;
        // Check there is nothing in the remaining unused fields.
        for ($i = $numboundaries; $i < count($formdata); $i += 1) {
            if (!empty($formdata[$i]->boundary) &&
                    trim($formdata[$i]->boundary) != '') {
                $errors["feedbackboundaries[$i]"] =
                    get_string('feedbackerrorjunkinboundary', 'quiz', $i + 1);
            }
        }
        for ($i = $numboundaries; $i < count($formdata); $i += 1) {
            if (!empty($formdata[$i]->feedback->text) &&
                    trim($formdata[$i]->feedback->text) != '') {
                $errors["feedbacktext[$i]"] =
                    get_string('feedbackerrorjunkinfeedback', 'quiz', $i + 1);
            }
        }
        $result->errors = json_encode($errors);
        $result->isvalid = empty($errors);
        $result->data = json_encode($formdata);

        return $result;
    }

    /**
     * Describes the return information.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'isvalid' => new external_value(PARAM_BOOL, 'Whether the form data is valid.'),
            'errors' => new external_value(PARAM_RAW, 'Error messages appear whenever form data is not valid.', VALUE_OPTIONAL),
            'warnings' => new external_warnings(),
            'data' => new external_value(PARAM_RAW, 'Error messages appear whenever form data is not valid.', VALUE_OPTIONAL),
        ]);
    }
}
