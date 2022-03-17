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

namespace tool_usertours;

use tool_usertours\local\filter\excludecourse;

/**
 * Tests for exclude course filter.
 *
 * @package tool_usertours
 * @copyright 2022 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class excludecourse_filter_test extends \advanced_testcase {
    /**
     * @var \stdClass $course Test course
     */
    protected $course;

    /**
     * @var \stdClass $course2 Test $course2
     */
    protected $course2;

    /**
     * @var \stdClass $module Test module
     */
    protected $module;

    public function setUp(): void {
        $this->resetAfterTest(true);
        $generator = $this->getDataGenerator();

        $this->course = $generator->create_course();
        $this->course2 = $generator->create_course();
        $this->module = $generator->create_module('page', ['course' => $this->course->id]);
    }

    /**
     * Data Provider for filter_matches function.
     *
     * @return array
     */
    public function filter_matches_provider(): array {
        return [
            'No config set; Matches' => [
                null,
                'contextcourse',
                true,
            ],
            'Empty config set; Matches' => [
                [],
                'contextcourse',
                true,
            ],
            'Single value set; No match' => [
                ['course1'],
                'contextcourse',
                false,
            ],
            'Multiple values set including matching; No match' => [
                ['course1', 'course2'],
                'contextcourse',
                false,
            ],
            'Single non-matching value; Match' => [
                ['course2'],
                'contextcourse',
                true,
            ],
            'Single matching value, check module context; No match' => [
                ['course1'],
                'contextmodule',
                false,
            ],
        ];
    }

    /**
     * Test the filter_matches function.
     *
     * @dataProvider filter_matches_provider
     * @param mixed $filtervalues The filter values
     * @param string $context The test context
     * @param bool $expected Whether the tour is expected to match
     *
     * @covers \tool_usertours\local\filter\excludecourse::filter_matches
     */
    public function test_filter_matches($filtervalues, string $context, bool $expected): void {
        global $COURSE;
        $filtername = excludecourse::class;

        // Note: No need to persist this tour.
        $tour = new tour();

        // Set up filter values.
        if (!empty($filtervalues)) {
            if (count($filtervalues) == 1) {
                $filtervalues[0] === 'course1' ? $tour->set_filter_values('excludecourse', [$this->course->id])
                        : $tour->set_filter_values('excludecourse', [$this->course2->id]);
            } else if (count($filtervalues) == 2) {
                $tour->set_filter_values('excludecourse', [$this->course->id, $this->course2->id]);
            }
        }

        // Set the current course.
        $COURSE = $this->course;

        // Set up test context.
        $testcontext = \context_course::instance($this->course->id);
        if ($context === 'contextmodule') {
            $testcontext = \context_module::instance($this->module->cmid);
        }

        $this->assertEquals($expected, $filtername::filter_matches($tour, $testcontext));
    }

    /**
     * Test the filter_matches function when any course is set.
     *
     * @covers \tool_usertours\local\filter\excludecourse::filter_matches
     */
    public function test_filter_matches_if_page_not_within_a_course(): void {
        $filtername = excludecourse::class;
        $context = \context_course::instance($this->course->id);
        $tour = new tour();
        $tour->set_filter_values('excludecourse', [$this->course->id, $this->course2->id]);
        $this->assertTrue($filtername::filter_matches($tour, $context));
    }
}
