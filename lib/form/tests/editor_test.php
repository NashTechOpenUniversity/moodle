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
 * Unit tests for editor forms element.
 *
 * This file contains all unit test related to editor forms element.
 *
 * @package    core_form
 * @copyright  2021 Hieu Vu <hieuvu@nashtechglobal.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->libdir . '/form/editor.php');

/**
 * Unit tests for MoodleQuickForm_editor
 *
 * Contains test cases for testing MoodleQuickForm_editor
 *
 * @package    core_form
 * @copyright  2021 Hieu Vu <hieuvu@nashtechglobal.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class core_form_editor_testcase extends advanced_testcase {

    /**
     * Test case for validation
     *
     * @param bool $expectedresult image check image have alt tag.
     * @param string $imagestring the image html test string.
     * @dataProvider do_all_img_tags_have_alt_testcases
     */
    public function test_do_all_img_tags_have_alt($expectedresult, $imagestring) {
        $this->assertEquals($expectedresult, MoodleQuickForm_editor::do_all_img_tags_have_alt($imagestring));
    }

    /**
     * Data provider for {@see test_do_all_img_tags_have_alt}.
     *
     * @return array of test cases.
     */
    public function do_all_img_tags_have_alt_testcases(): array {
        return [
                [true, '<img href="example.com" alt="">'],
                [true, '<img class="class-test" href="example.com" alt="Test image alt">'],
                [true, '<img alt="Test image alt" class="class-test" href="example.com">'],
                [true, '<img alt="" href="example.com">'],
                [false, '<img href="example.com">'],
                [false, '<img class="class-test" href="example.com">'],
                [false, '<img alt class="class-test" href="example.com">'],
                [false, '<img class="class-test" href="example.com" alt>'],
        ];
    }
}