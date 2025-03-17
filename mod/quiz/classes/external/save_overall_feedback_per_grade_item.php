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

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use core_external\external_warnings;
use mod_quiz\form\overallfeedback_form;
use mod_quiz\quiz_settings;
use stdClass;

/**
 * Validate and store overall feedback for each grade item form.
 *
 * @package   mod_quiz
 * @copyright 2024 The Open University
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class save_overall_feedback_per_grade_item extends external_api {

    /**
     * Declare the method parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'quizid' => new external_value(PARAM_INT, 'The quiz to save feedback.'),
            'gradeitemid' => new external_value(PARAM_INT, 'The grade item id to save the feedback.'),
            'formdata' => new external_value(PARAM_RAW, 'The feedback form data.'),
        ]);
    }

    /**
     * For quiz with grade items already set up, validate the form data in the correct format before creating it.
     *
     * @param int $quizid the id of the quiz to save feedback.
     * @param int $gradeitemid the grade item id of the quiz to save feedback.
     * @param string $formdata Form data needs to save.
     * @return stdClass Result info.
     */
    public static function execute(int $quizid, int $gradeitemid, string $formdata): stdClass {
        global $DB, $PAGE;

        $params = external_api::validate_parameters(self::execute_parameters(), [
            'formdata' => $formdata,
            'quizid' => $quizid,
            'gradeitemid' => $gradeitemid,
        ]);

        $formdata = json_decode($params['formdata']);

        // Remove first 100% data from formData, we don't need to validate it.
        $firstdata = array_shift($formdata);
        $quizobj = quiz_settings::create($quizid);
        $grade = $quizobj->get_quiz()->grade;
        $cmid = $quizobj->get_cmid();
        $context = \context_module::instance($cmid);
        $PAGE->set_context($context);
        $args['grade'] = $grade;
        $args['context'] = $context->id;
        $args['gradeItemId'] = $gradeitemid;

        // Use form validation.
        $form = new overallfeedback_form(null, $args);
        [$errors, $data] = $form->validation(['grade' => $grade, 'formdata' => $formdata], false);

        $result = (object) [
            'warnings' => [],
            'errors' => json_encode([]),
            'total' => 0,
        ];

        // Sort the array by 'boundary' in descending order. This is necessary because users can enter a
        // list of overall feedback with boundary data out of order. For example, the list might be:
        // ["100%" => "100% feedback", "20%" => "20% feedback", "80%" => "80% feedback"].
        // When processed, the boundary data will be converted to corresponding decimal numbers: 1, 0.2, and 0.8,
        // respectively. The code ensures that these values are ordered in descending order before storing them in
        // the database. As a result, the final order will be 1, 0.8, and 0.2.
        usort($data, function ($a, $b) {
            if ($a->boundary > $b->boundary) {
                return -1;
            } else if ($a->boundary < $b->boundary) {
                return 1;
            }
            return 0;
        });

        if (count($errors) > 0) {
            $result->errors = json_encode($errors);
            return  $result;
        }

        // Put the 100% boundary data back into the form.
        // Set the boundary default value for the first boundary.
        // The value should be a number greater than 1 to support the database query for
        // retrieving feedback based on the answer grade.
        $firstdata->boundary = 2;
        array_unshift($data, $firstdata);
        $formdata = $data;
        $DB->delete_records('quiz_grade_item_feedbacks', ['quizid' => $quizid, 'gradeitemid' => $gradeitemid]);

        $index = 0;
        $total = 0;
        foreach ($formdata as $key => $data) {
            $index++;
            // Skip redundant data.
            if ($key === 0) {
                if (empty($data->feedback->text)) {
                    continue;
                }
            } else {
                if (empty($data->boundary)) {
                    continue;
                }
            }
            $feedback = new stdClass();
            $feedback->quizid = $quizid;
            $feedback->gradeitemid = $gradeitemid;
            $feedback->feedbacktext = $data->feedback->text;
            $feedback->feedbacktextformat = $data->feedback->format;
            $feedback->mingrade = isset($formdata[$index]) ? $formdata[$index]->boundary : 0;
            $feedback->maxgrade = $data->boundary;
            $feedback->id = $DB->insert_record('quiz_grade_item_feedbacks', $feedback);
            $feedbacktext = file_save_draft_area_files((int) $data->feedback->itemid,
                $context->id, 'mod_quiz', 'grade_item_feedback', $feedback->id,
                ['subdirs' => false, 'maxfiles' => -1, 'maxbytes' => 0],
                $data->feedback->text);
            $DB->set_field('quiz_grade_item_feedbacks', 'feedbacktext', $feedbacktext,
                ['id' => $feedback->id]);
            $total++;
        }
        $result->total = $total;

        return $result;
    }

    /**
     * Describes the return information.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'warnings' => new external_warnings(),
            'errors' => new external_value(PARAM_RAW, 'Error messages appear whenever form data is not valid.'),
            'total' => new external_value(PARAM_INT, 'The number of overall feedbacks records.'),
        ]);
    }
}
