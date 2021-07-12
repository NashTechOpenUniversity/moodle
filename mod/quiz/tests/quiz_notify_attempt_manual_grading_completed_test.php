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
 * Contains the class containing unit tests for the quiz notify attempt manual grading completed cron task.
 *
 * @package   mod_quiz
 * @copyright 2021 The Open University
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace core\task;

use advanced_testcase;
use context_course;
use context_module;
use mod_quiz\task\quiz_notify_attempt_manual_grading_completed;
use question_engine;
use quiz;
use quiz_attempt;
use stdClass;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot.'/group/lib.php');
/**
 * Class containing unit tests for the quiz notify attempt manual grading completed cron task.
 *
 * @package mod_quiz
 * @copyright 2021 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class quiz_notify_attempt_manual_grading_completed_testcase extends advanced_testcase {
    /**
     * Set up for every test
     */
    public function setUp(): void {
        global $DB;

        $this->resetAfterTest();
        $this->setAdminUser();

        // Setup test data.
        $this->course = $this->getDataGenerator()->create_course();
        $this->quiz = $this->getDataGenerator()->create_module('quiz', array('course' => $this->course->id));
        $this->context = context_module::instance($this->quiz->cmid);
        $this->cm = get_coursemodule_from_instance('quiz', $this->quiz->id);

        // Create users.
        $this->student = self::getDataGenerator()->create_user();
        $this->teacher = self::getDataGenerator()->create_user();

        // Users enrolments.
        $this->studentrole = $DB->get_record('role', array('shortname' => 'student'));
        $this->teacherrole = $DB->get_record('role', array('shortname' => 'editingteacher'));

        // Allow student to receive messages.
        $coursecontext = context_course::instance($this->course->id);
        assign_capability('mod/quiz:emailnotifyattemptgraded', CAP_ALLOW, $this->studentrole->id, $coursecontext, true);

        $this->getDataGenerator()->enrol_user($this->student->id, $this->course->id, $this->studentrole->id, 'manual');
        $this->getDataGenerator()->enrol_user($this->teacher->id, $this->course->id, $this->teacherrole->id, 'manual');

        // Make a quiz.
        $quizgenerator = $this->getDataGenerator()->get_plugin_generator('mod_quiz');
        $this->quiz = $quizgenerator->create_instance(['course' => $this->course->id, 'questionsperpage' => 0,
            'grade' => 100.0, 'sumgrades' => 2]);

        // Create a question.
        $questiongenerator = $this->getDataGenerator()->get_plugin_generator('core_question');
        $cat = $questiongenerator->create_question_category();
        $truefalse = $questiongenerator->create_question('truefalse', null, array('category' => $cat->id));
        $essay = $questiongenerator->create_question('essay', null, array('category' => $cat->id));

        // Add them to the quiz.
        quiz_add_quiz_question($truefalse->id, $this->quiz);
        quiz_add_quiz_question($essay->id, $this->quiz);

        $this->quizobj = quiz::create($this->quiz->id);
        $this->quba = question_engine::make_questions_usage_by_activity('mod_quiz', $this->quizobj->get_context());
        $this->quba->set_preferred_behaviour($this->quizobj->get_quiz()->preferredbehaviour);
    }

    /**
     * Test SQL querry get list attempt in condition.
     */
    public function test_get_list_of_attempts_within_conditions() {
        global $DB;

        // Create an attempt with completely graded.
        $timenow = time();
        $attempt1 = quiz_create_attempt($this->quizobj, 1, null, $timenow, false, $this->student->id);
        quiz_start_new_attempt($this->quizobj, $this->quba, $attempt1, 1, $timenow);
        quiz_attempt_save_started($this->quizobj, $this->quba, $attempt1);

        // Process some responses from the student.
        $attemptobj1 = quiz_attempt::create($attempt1->id);
        $tosubmit = [2 => ['answer' => 'Student 1 answer', 'answerformat' => FORMAT_HTML]];
        $attemptobj1->process_submitted_actions($timenow, false, $tosubmit);
        $attemptobj1->process_finish($timenow, false);

        // Finish the attempt of student.
        $attemptobj1->get_question_usage()->manual_grade(2, 'Good!', 1, FORMAT_HTML, $timenow);
        question_engine::save_questions_usage_by_activity($attemptobj1->get_question_usage());

        $update = new stdClass();
        $update->id = $attemptobj1->get_attemptid();
        $update->timemodified = $timenow;
        $update->sumgrades = $attemptobj1->get_question_usage()->get_total_mark();
        $DB->update_record('quiz_attempts', $update);
        quiz_save_best_grade($attemptobj1->get_quiz(), $this->student->id);

        set_config('notifyattemptgradeddelay', 0, 'quiz');

        $task = new quiz_notify_attempt_manual_grading_completed();
        $attempts = $task->get_list_of_attempts();

        $this->assertEquals(1, iterator_count($attempts));
    }

    /**
     * Test SQL querry get list attempt which attempt has not completely graded.
     */
    public function test_get_list_of_attempts_without_manual_graded() {
        // Create an attempt without grading.
        $timenow = time();
        $attempt2 = quiz_create_attempt($this->quizobj, 2, null, $timenow, false, $this->student->id);
        quiz_start_new_attempt($this->quizobj, $this->quba, $attempt2, 2, $timenow);
        quiz_attempt_save_started($this->quizobj, $this->quba, $attempt2);

        // Process some responses from the student.
        $attemptobj2 = quiz_attempt::create($attempt2->id);
        $tosubmit = [2 => ['answer' => 'Answer of student 2.', 'answerformat' => FORMAT_HTML]];
        $attemptobj2->process_submitted_actions($timenow, false, $tosubmit);
        $attemptobj2->process_finish($timenow, false);

        set_config('notifyattemptgradeddelay', 0, 'quiz');

        $task = new quiz_notify_attempt_manual_grading_completed();
        $attempts = $task->get_list_of_attempts();

        $this->assertEquals(0, iterator_count($attempts));
    }

    /**
     * Test notify manual grading completed cron which the user attempt has not capability.
     */
    public function test_notify_manual_grading_completed_cron_without_capability() {
        global $DB;

        // Create an attempt without capability.
        $timenow = time();
        $attempt = quiz_create_attempt($this->quizobj, 3, null, $timenow, false, $this->teacher->id);
        quiz_start_new_attempt($this->quizobj, $this->quba, $attempt, 3, $timenow);
        quiz_attempt_save_started($this->quizobj, $this->quba, $attempt);

        // Process some responses.
        $attemptobj = quiz_attempt::create($attempt->id);
        $tosubmit = [2 => ['answer' => 'Answer of teacher.', 'answerformat' => FORMAT_HTML]];
        $attemptobj->process_submitted_actions($timenow, false, $tosubmit);
        $attemptobj->process_finish($timenow, false);

        // Finish the attempt.
        $attemptobj->get_question_usage()->manual_grade(2, 'Good!', 1, FORMAT_HTML, $timenow);
        question_engine::save_questions_usage_by_activity($attemptobj->get_question_usage());

        $update = new stdClass();
        $update->id = $attemptobj->get_attemptid();
        $update->timemodified = $timenow;
        $update->sumgrades = $attemptobj->get_question_usage()->get_total_mark();
        $DB->update_record('quiz_attempts', $update);
        quiz_save_best_grade($attemptobj->get_quiz(), $this->student->id);

        set_config('notifyattemptgradeddelay', 0, 'quiz');

        // Run the quiz notify attempt manual graded task.
        ob_start();
        $task = new quiz_notify_attempt_manual_grading_completed();
        $task->execute();
        ob_end_clean();

        $attemptobj = quiz_attempt::create($attempt->id);

        $this->assertEquals($attemptobj->get_attempt()->timefinish, $attemptobj->get_attempt()->gradednotificationsenttime);
    }

    /**
     * Test notify manual grading completed cron which the user attempt has capability.
     */
    public function test_notify_manual_grading_completed_cron_with_capability() {
        global $DB;

        // Create an attempt with capability.
        $timenow = time();
        $attempt = quiz_create_attempt($this->quizobj, 4, null, $timenow, false, $this->student->id);
        quiz_start_new_attempt($this->quizobj, $this->quba, $attempt, 4, $timenow);
        quiz_attempt_save_started($this->quizobj, $this->quba, $attempt);

        // Process some responses from the student.
        $attemptobj = quiz_attempt::create($attempt->id);
        $tosubmit = [2 => ['answer' => 'Answer of student.', 'answerformat' => FORMAT_HTML]];
        $attemptobj->process_submitted_actions($timenow, false, $tosubmit);
        $attemptobj->process_finish($timenow, false);

        // Finish the attempt of student.
        $attemptobj->get_question_usage()->manual_grade(2, 'Good!', 1, FORMAT_HTML, $timenow);
        question_engine::save_questions_usage_by_activity($attemptobj->get_question_usage());

        $update = new stdClass();
        $update->id = $attemptobj->get_attemptid();
        $update->timemodified = $timenow;
        $update->sumgrades = $attemptobj->get_question_usage()->get_total_mark();
        $DB->update_record('quiz_attempts', $update);
        quiz_save_best_grade($attemptobj->get_quiz(), $this->student->id);

        set_config('notifyattemptgradeddelay', 0, 'quiz');

        // Run the quiz notify attempt manual graded task.
        ob_start();
        $task = new quiz_notify_attempt_manual_grading_completed();
        $task->execute();
        ob_end_clean();

        $attemptobj = quiz_attempt::create($attempt->id);

        $this->assertNotEquals(null, $attemptobj->get_attempt()->gradednotificationsenttime);
        $this->assertNotEquals($attemptobj->get_attempt()->timefinish, $attemptobj->get_attempt()->gradednotificationsenttime);
    }
}
