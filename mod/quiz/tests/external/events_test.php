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
 * Quiz module external functions tests.
 *
 * @package    mod_quiz
 * @category   external
 * @copyright  2016 Juan Leyva <juan@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since      Moodle 3.1
 */

namespace mod_quiz\external;

use mod_quiz\external\get_groups_for_selector_by_cmid;

use core_external\external_api;
use core_question\local\bank\question_version_status;
use externallib_advanced_testcase;
use mod_quiz\question\display_options;
use mod_quiz\quiz_attempt;
use mod_quiz\quiz_settings;
use mod_quiz\structure;
use mod_quiz_external;
use moodle_exception;

defined('MOODLE_INTERNAL') || die();

global $CFG;

require_once($CFG->dirroot . '/webservice/tests/helpers.php');
require_once($CFG->dirroot . '/mod/quiz/tests/quiz_question_helper_test_trait.php');

/**
 * Silly class to access mod_quiz_external internal methods.
 *
 * @package mod_quiz
 * @copyright 2016 Juan Leyva <juan@moodle.com>
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since  Moodle 3.1
 */
class events_test extends \advanced_testcase {
    /**
     * Test get_groups_for_selector_by_cmid service.
     *
     * @covers ::get_groups_for_selector_by_cmid
     */
    public function test_get_groups_for_selector_by_cmid():void {
        global $DB;

        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $quiz = $this->getDataGenerator()->create_module('quiz', ['course' => $course->id]);
        $this->setAdminUser();

        // Setup group.
        $user = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($user->id, $course->id);
        $group = $this->getDataGenerator()->create_group(['courseid' => $course->id]);
        $this->getDataGenerator()->create_group_member(['groupid' => $group->id, 'userid' => $user->id]);

        // By default, group mode of quiz is no group.
        $groups = get_groups_for_selector_by_cmid::execute($quiz->cmid);
        $this->assertCount(0, $groups['groups']);

        // Now set the quiz to be group mode: separate group, and re-test.
        $cm = get_coursemodule_from_id('quiz', $quiz->cmid, $course->id);
        $DB->set_field('course_modules', 'groupmode', SEPARATEGROUPS, ['id' => $cm->id]);

        $groups = get_groups_for_selector_by_cmid::execute($quiz->cmid);

        // It contains two item: All participant and the new group.
        $this->assertCount(2, $groups['groups']);
    }

    /**
     * Test get_users_in_report service.
     *
     * @covers ::get_users_in_report
     */
    public function test_get_users_in_report():void {
        $this->resetAfterTest();

        $dg = $this->getDataGenerator();
        $course =$dg->create_course();
        $quizgen = $dg->get_plugin_generator('mod_quiz');
        $this->setAdminUser();

        $u1 = $dg->create_user();
        $u2 = $dg->create_user();

        $dg->enrol_user($u1->id, $course->id, 'student');
        $dg->enrol_user($u2->id, $course->id, 'student');

        $quiz = $quizgen->create_instance(['course' => $course->id, 'sumgrades' => 2]);

        // Questions.
        $questgen = $dg->get_plugin_generator('core_question');
        $quizcat = $questgen->create_question_category();
        $question = $questgen->create_question('numerical', null, ['category' => $quizcat->id]);
        quiz_add_quiz_question($question->id, $quiz);

        $quizobj1a = quiz_settings::create($quiz->id, $u1->id);
        $quizobj1b = quiz_settings::create($quiz->id, $u2->id);

        // Set attempts.
        $quba1a = \question_engine::make_questions_usage_by_activity('mod_quiz', $quizobj1a->get_context());
        $quba1a->set_preferred_behaviour($quizobj1a->get_quiz()->preferredbehaviour);
        $quba1b = \question_engine::make_questions_usage_by_activity('mod_quiz', $quizobj1b->get_context());
        $quba1b->set_preferred_behaviour($quizobj1b->get_quiz()->preferredbehaviour);

        $timenow = time();

        $users = get_users_in_report::execute($quiz->cmid, 'overview',
            'quiz_overview_table', 'quiz_overview_options', 'enrolled_with', '', false)['users'];
        $this->assertCount(0, $users);

        // User 1 passes quiz 1.
        $attempt = quiz_create_attempt($quizobj1a, 1, false, $timenow, false, $u1->id);
        quiz_start_new_attempt($quizobj1a, $quba1a, $attempt, 1, $timenow);
        quiz_attempt_save_started($quizobj1a, $quba1a, $attempt);
        $attemptobj = quiz_attempt::create($attempt->id);
        $attemptobj->process_submitted_actions($timenow, false, [1 => ['answer' => '3.14']]);
        $attemptobj->process_finish($timenow, false);

        // User 2 does not finish quiz.
        $attempt = quiz_create_attempt($quizobj1b, 1, false, $timenow, false, $u2->id);
        quiz_start_new_attempt($quizobj1b, $quba1b, $attempt, 1, $timenow);
        quiz_attempt_save_started($quizobj1b, $quba1b, $attempt);

        // Check all users.
        $users = get_users_in_report::execute($quiz->cmid, 'overview',
            'quiz_overview_table', 'quiz_overview_options', 'enrolled_with', '', false)['users'];
        $this->assertCount(2, $users);

        // Get only attempt has the state is finished.
        $users = get_users_in_report::execute($quiz->cmid, 'overview',
            'quiz_overview_table', 'quiz_overview_options', 'enrolled_with', 'finished', false)['users'];
        $this->assertCount(1, $users);
    }
}