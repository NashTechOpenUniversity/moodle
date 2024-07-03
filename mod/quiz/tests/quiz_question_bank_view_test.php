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

namespace mod_quiz;

use core_question\local\bank\question_edit_contexts;
use mod_quiz\question\bank\custom_view;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/question/editlib.php');

/**
 * Unit tests for the quiz's own question bank view class.
 *
 * @package    mod_quiz
 * @category   test
 * @copyright  2018 the Open University
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers \mod_quiz\question\bank\custom_view
 */
class quiz_question_bank_view_test extends \advanced_testcase {
    /**
     * @var \stdClass
     */
    private $cm;
    /**
     * @var \StdClass
     */
    private $question;
    /**
     * @var \stdClass
     */
    private $quiz;
    /**
     * @var question_edit_contexts
     */
    private $contexts;
    /**
     * @var \core\context\module
     */
    private $context;
    /**
     * @var \stdClass
     */
    private $course;
    /**
     * @var object
     */
    private $cat;

    public function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $this->setAdminUser();
        $generator = $this->getDataGenerator();
        /** @var core_question_generator $questiongenerator */
        $questiongenerator = $generator->get_plugin_generator('core_question');

        // Create a course and a quiz.
        $this->course = $generator->create_course();
        $this->quiz = $this->getDataGenerator()->create_module('quiz', ['course' => $this->course->id]);
        $this->context = \context_module::instance($this->quiz->cmid);
        $this->cm = get_coursemodule_from_instance('quiz', $this->quiz->id);

        // Create a question in the default category.
        $this->contexts = new question_edit_contexts($this->context);
        question_make_default_categories($this->contexts->all());
        $this->cat = question_get_default_category($this->context->id);
        $this->question = $questiongenerator->create_question('numerical', null,
            ['name' => 'Example question', 'category' => $this->cat->id]);
    }

    public function test_viewing_question_bank_should_not_load_individual_questions(): void {
        // Ensure the question is not in the cache.
        $cache = \cache::make('core', 'questiondata');
        $cache->delete($this->question->id);

        // Generate the view.
        $params = [
            'qpage' => 0,
            'qperpage' => 20,
            'cat' => $this->cat->id . ',' . $this->context->id,
            'recurse' => false,
            'showhidden' => false,
            'qbshowtext' => false,
            'tabname' => 'editq'
        ];
        $extraparams = ['cmid' => $this->cm->id];
        $view = new custom_view($this->contexts, new \moodle_url('/'), $this->course, $this->cm, $params, $extraparams);
        ob_start();
        $view->display();
        $html = ob_get_clean();

        // Verify the output includes the expected question.
        $this->assertStringContainsString('Example question', $html);

        // Verify the question has not been loaded into the cache.
        $this->assertFalse($cache->has($this->question->id));
    }

    public function test_viewing_question_bank_should_not_load_hidden_question(): void {
        $generator = $this->getDataGenerator();
        /** @var core_question_generator $questiongenerator */
        $questiongenerator = $generator->get_plugin_generator('core_question');

        // Create another version.
        $newversion = $questiongenerator->update_question($this->question, null, ['name' => 'This is the latest version']);

        // Add them to the quiz.
        quiz_add_quiz_question($newversion->id, $this->quiz);
        // Generate the view.
        $params = [
            'qpage' => 0,
            'qperpage' => 20,
            'cat' => $this->cat->id . ',' . $this->context->id,
            'recurse' => false,
            'showhidden' => false,
            'qbshowtext' => false,
            'tabname' => 'editq',
        ];
        $extraparams = ['cmid' => $this->cm->id];
        $view = new custom_view($this->contexts, new \moodle_url('/'), $this->course, $this->cm, $params, $extraparams);
        ob_start();
        $view->display();
        $html = ob_get_clean();
        // Verify the output should included the latest version.
        $this->assertStringContainsString('This is the latest version', $html);
        $this->assertStringNotContainsString('Example question', $html);
        // Delete the latest version.
        question_delete_question($newversion->id);
        // Verify the output should display the old version with status ready.
        ob_start();
        $view->display();
        $html = ob_get_clean();
        $this->assertStringContainsString('Example question', $html);
        $this->assertStringNotContainsString('This is the latest version', $html);
    }
}
