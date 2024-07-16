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
        global $DB;

        $params = external_api::validate_parameters(self::execute_parameters(), [
            'formdata' => $formdata,
            'quizid' => $quizid,
            'gradeitemid' => $gradeitemid,
        ]);

        $formdata = json_decode($params['formdata']);

        $quizobj = quiz_settings::create($quizid);
        $cmid = $quizobj->get_cmid();

        // We need to use context now, so we need to make sure all needed info is already in db.
        $DB->set_field('course_modules', 'instance', $quizid, ['id' => $cmid]);
        $context = \context_module::instance($cmid);

        // Save the feedback.
        $DB->delete_records('quiz_grade_item_feedback', ['quizid' => $quizid, 'gradeitemid' => $gradeitemid]);

        foreach($formdata as $key => $data) {
            $feedback = new stdClass();
            $feedback->quizid = $quizid;
            $feedback->gradeitemid = $gradeitemid;
            $feedback->feedbacktext = $data->feedback->text;
            $feedback->feedbacktextformat = $data->feedback->format;
            $feedback->mingrade = $formdata[$key + 1] ? $formdata[$key + 1]->boundary : 0;
            $feedback->maxgrade = $data->boundary;
            $feedback->id = $DB->insert_record('quiz_grade_item_feedback', $feedback);
            $feedbacktext = file_save_draft_area_files((int) $data->feedback->itemid,
                $context->id, 'mod_quiz', 'feedback', $feedback->id, ['subdirs' => false, 'maxfiles' => -1, 'maxbytes' => 0],
                $data->feedback->text);
            $DB->set_field('quiz_grade_item_feedback', 'feedbacktext', $feedbacktext,
                ['id' => $feedback->id]);
        }
        $result = (object) [
            'warnings' => [],
        ];

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
        ]);
    }
}
