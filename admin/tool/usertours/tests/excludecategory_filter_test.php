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

use tool_usertours\local\filter\excludecategory;

/**
 * Tests for exclude category filter.
 *
 * @package tool_usertours
 * @copyright 2022 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class excludecategory_filter_test extends \advanced_testcase {
    /**
     * @var \stdClass $course Test course
     */
    protected $course;

    /**
     * @var \stdClass $category Test category
     */
    protected $category;

    /**
     * @var \stdClass $category2 Test category2
     */
    protected $category2;

    /**
     * @var \stdClass $user Test user
     */
    protected $user;

    public function setUp(): void {
        $this->resetAfterTest(true);
        $generator = $this->getDataGenerator();
        $this->user = $generator->create_user();

        $this->category = $generator->create_category();
        $this->category2 = $generator->create_category();

        $this->course = $generator->create_course(['category' => $this->category->id]);
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
                'catcontext',
                true,
            ],
            'Empty config set; Matches' => [
                [],
                'catcontext',
                true,
            ],
            'Single value set; No match' => [
                ['cat1'],
                'catcontext',
                false,
            ],
            'Multiple values set including matching; No match' => [
                ['cat1', 'cat2'],
                'catcontext',
                false,
            ],
            'Single non-matching value set; Match' => [
                ['cat2'],
                'catcontext',
                true,
            ],
            'Single value set, check course context; No match' => [
                ['cat1'],
                'coursecontext',
                false,
            ],
            'Single non-matching value set, check user context; Match' => [
                ['cat1'],
                'usercontext',
                true,
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
     * @covers \tool_usertours\local\filter\excludecategory::filter_matches
     */
    public function test_filter_matches($filtervalues, string $context, bool $expected): void {
        $filtername = excludecategory::class;
        // Note: No need to persist this tour.
        $tour = new tour();

        // Set up filter values.
        if (!empty($filtervalues)) {
            if (count($filtervalues) == 1) {
                $filtervalues[0] === 'cat1' ? $tour->set_filter_values('excludecategory', [$this->category->id])
                        : $tour->set_filter_values('excludecategory', [$this->category2->id]);
            } else if (count($filtervalues) == 2) {
                $tour->set_filter_values('excludecategory', [$this->category->id, $this->category2->id]);
            }
        }

        // Set up test context.
        $testcontext = \context_coursecat::instance($this->category->id);
        if ($context === 'usercontext') {
            $testcontext = \context_user::instance($this->user->id);
        } else if ($context === 'coursecontext') {
            $testcontext = \context_course::instance($this->course->id);
        }

        $this->assertEquals($expected, $filtername::filter_matches($tour, $testcontext));
    }
}
