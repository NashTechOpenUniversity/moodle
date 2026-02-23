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

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../../../../webservice/tests/helpers.php');

use core_question_generator;
use externallib_advanced_testcase;
use mod_quiz\quiz_settings;

/**
 * Test for the grade_items CRUD service.
 *
 * @package   mod_quiz
 * @category  external
 * @copyright 2024 The Open University
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers \mod_quiz\external\get_max_mark
 * @covers \mod_quiz\external\update_max_mark
 * @covers \mod_quiz\external\update_page_break
 * @covers \mod_quiz\external\move_slot
 * @covers \mod_quiz\external\delete_multiple
 * @covers \mod_quiz\external\update_question_dependency
 * @covers \mod_quiz\external\delete_resource
 */
final class quiz_resources_test extends externallib_advanced_testcase {


    /**
     * Test the behavior of get max mark.
     */
    public function test_get_max_mark(): void {
        $quizobj = $this->create_quiz_with_two_grade_items();

        $structure = $quizobj->get_structure();
        $result = get_max_mark::execute($quizobj->get_quizid(), $structure->get_slot_id_for_slot(1));
        $this->assertArrayHasKey('instancemaxmark', $result);
        $this->assertEquals('1.00', $result['instancemaxmark']);
    }

    /**
     * Test the behavior of update max mark.
     */
    public function test_update_max_mark(): void {
        $quizobj = $this->create_quiz_with_two_grade_items();

        $structure = $quizobj->get_structure();
        $result = update_max_mark::execute($quizobj->get_quizid(), $structure->get_slot_id_for_slot(1), 8);

        $this->assertArrayHasKey('instancemaxmark', $result);
        $this->assertArrayHasKey('newsummarks', $result);
        $this->assertEquals('8.00', $result['instancemaxmark']);

        $result = update_max_mark::execute($quizobj->get_quizid(), $structure->get_slot_id_for_slot(1), 8.4);
        $this->assertArrayHasKey('instancemaxmark', $result);
        $this->assertArrayHasKey('newsummarks', $result);
        $this->assertEquals('8.40', $result['instancemaxmark']);
    }

    /**
     * Test the behavior of update page break.
     */
    public function test_update_page_break(): void {
        $quizobj = $this->create_quiz_with_two_grade_items();
        $structure = $quizobj->get_structure();

        // The default page of question slot 2 is 2.
        $this->assertEquals(2, $structure->get_question_in_slot(2)->page);

        // Update question slot 2 to page 1.
        $result = update_page_break::execute($quizobj->get_quizid(), $structure->get_slot_id_for_slot(2), 1);

        // Get the result value.
        $resultvalue = $result['slots'];

        // Decode the JSON string into an associative array.
        $resultvaluedecoded = json_decode($resultvalue, true);
        $this->assertEquals(1, $resultvaluedecoded[2]['page']);
    }

    /**
     * Test the behavior of move question slot.
     */
    public function test_move_slot(): void {
        $quizobj = $this->create_quiz_with_two_grade_items();
        $structure = $quizobj->get_structure();
        $defaultsection = array_values($structure->get_sections())[0];

        // Move question slot 1 to page 2.
        $result = move_slot::execute($quizobj->get_quizid(), $structure->get_slot_id_for_slot(1),
            $structure->get_slot_id_for_slot(2), $defaultsection->id, 2);
        $this->assertTrue($result['visible']);
    }

    /**
     * Test the behavior of delete multiple resource(question slots).
     */
    public function test_delete_multiple(): void {
        $quizobj = $this->create_quiz_with_two_grade_items();
        $structure = $quizobj->get_structure();
        $ids = $structure->get_slot_id_for_slot(1) . ',' . $structure->get_slot_id_for_slot(2);
        $result = delete_multiple::execute($quizobj->get_quizid(), $ids);

        $this->assertArrayHasKey('newsummarks', $result);
        $this->assertArrayHasKey('deleted', $result);
        $this->assertArrayHasKey('newnumquestions', $result);

        $this->assertEquals('0.00', $result['newsummarks']);
        $this->assertTrue($result['deleted']);
        $this->assertEquals('0', $result['newnumquestions']);
    }

    /**
     * Test the behavior of update question dependency.
     */
    public function test_update_question_dependency(): void {
        $quizobj = $this->create_quiz_with_two_grade_items();
        $structure = $quizobj->get_structure();

        $result = update_question_dependency::execute($quizobj->get_quizid(), $structure->get_slot_id_for_slot(1), 0);
        $this->assertArrayHasKey('requireprevious', $result);
        $this->assertFalse($result['requireprevious']);
        $result = update_question_dependency::execute($quizobj->get_quizid(), $structure->get_slot_id_for_slot(1), 1);
        $this->assertArrayHasKey('requireprevious', $result);
        $this->assertTrue($result['requireprevious']);
    }

    /**
     * Test the behavior of delete a single resource(question slots).
     */
    public function test_delete_resource(): void {
        $quizobj = $this->create_quiz_with_two_grade_items();
        $structure = $quizobj->get_structure();
        // Two question have been created before delete.
        $this->assertEquals(2, $structure->get_question_count());

        $result = delete_resource::execute($quizobj->get_quizid(), $structure->get_slot_id_for_slot(1));
        $this->assertArrayHasKey('newsummarks', $result);
        $this->assertArrayHasKey('deleted', $result);
        $this->assertArrayHasKey('newnumquestions', $result);
        $this->assertEquals('1.00', $result['newsummarks']);
        $this->assertTrue($result['deleted']);
        $this->assertEquals(1, $result['newnumquestions']);

        $structure = $quizobj->get_structure();
        $this->assertEquals(1, $structure->get_question_count());
    }

    /**
     * Create a quiz of two shortanswer questions, each contributing to a different grade item.
     *
     * @return quiz_settings the newly created quiz.
     */
    protected function create_quiz_with_two_grade_items(): quiz_settings {
        global $SITE;
        $this->resetAfterTest();
        $this->setAdminUser();

        // Make a quiz.
        /** @var \mod_quiz_generator $quizgenerator */
        $quizgenerator = $this->getDataGenerator()->get_plugin_generator('mod_quiz');

        $quiz = $quizgenerator->create_instance(['course' => $SITE->id]);

        // Create two question.
        /** @var core_question_generator $questiongenerator */
        $questiongenerator = $this->getDataGenerator()->get_plugin_generator('core_question');
        $cat = $questiongenerator->create_question_category();
        $saq1 = $questiongenerator->create_question('shortanswer', null, ['category' => $cat->id]);
        $saq2 = $questiongenerator->create_question('shortanswer', null, ['category' => $cat->id]);

        // Add them to the quiz.
        quiz_add_quiz_question($saq1->id, $quiz, 0, 1);
        quiz_add_quiz_question($saq2->id, $quiz, 0, 1);

        // Create two quiz grade items.
        $listeninggrade = $quizgenerator->create_grade_item(['quizid' => $quiz->id, 'name' => 'Listening']);
        $readinggrade = $quizgenerator->create_grade_item(['quizid' => $quiz->id, 'name' => 'Reading']);

        // Set the questions to use those grade items.
        $quizobj = quiz_settings::create($quiz->id);
        $structure = $quizobj->get_structure();
        $structure->update_slot_grade_item($structure->get_slot_by_number(1), $listeninggrade->id);
        $structure->update_slot_grade_item($structure->get_slot_by_number(2), $readinggrade->id);
        $quizobj->get_grade_calculator()->recompute_quiz_sumgrades();

        return $quizobj;
    }
}
