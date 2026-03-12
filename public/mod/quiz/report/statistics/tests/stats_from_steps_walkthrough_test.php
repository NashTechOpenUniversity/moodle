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

namespace quiz_statistics;

use question_attempt;
use question_bank;
use question_finder;
use quiz_statistics_report;
use mod_quiz\quiz_attempt;
use mod_quiz\quiz_settings;
use mod_quiz\tests\question_helper_test_trait;

/**
 * Quiz attempt walk through using data from csv file.
 *
 * The quiz stats below and the question stats found in qstats00.csv were calculated independently in a spreadsheet which is
 * available in open document or excel format here :
 * https://github.com/jamiepratt/moodle-quiz-tools/tree/master/statsspreadsheet
 *
 * Similarly the question variant's stats in qstats00.csv are calculated in stats_for_variant_1.xls and stats_for_variant_8.xls
 * The calculations in the spreadsheets are the same as for the other question stats but applied just to the attempts where the
 * variants appeared.
 *
 * @package    quiz_statistics
 * @category   test
 * @copyright  2013 The Open University
 * @author     Jamie Pratt <me@jamiep.org>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class stats_from_steps_walkthrough_test extends \mod_quiz\tests\attempt_walkthrough_testcase {
    use question_helper_test_trait;

    /**
     * @var quiz_statistics_report object to do stats calculations.
     */
    protected $report;

    #[\Override]
    public static function setUpBeforeClass(): void {
        global $CFG;

        parent::setUpBeforeClass();

        require_once($CFG->dirroot . '/mod/quiz/report/statistics/report.php');
        require_once($CFG->dirroot . '/mod/quiz/report/reportlib.php');
    }

    #[\Override]
    protected static function get_test_files(): array {
        return ['questions', 'steps', 'results', 'qstats', 'responsecounts'];
    }

    /**
     * Create a quiz add questions to it, walk through quiz attempts and then check results.
     *
     * @param array $csvdata data read from csv file "questionsXX.csv", "stepsXX.csv" and "resultsXX.csv".
     * // phpcs:ignore moodle.PHPUnit.TestCaseProvider.dataProviderSyntaxMethodNotFound
     * @dataProvider get_data_for_walkthrough
     */
    public function test_walkthrough_from_csv($quizsettings, $csvdata): void {
        $this->create_quiz_simulate_attempts_and_check_results($quizsettings, $csvdata);

        $whichattempts = QUIZ_GRADEAVERAGE; // All attempts.
        $whichtries = question_attempt::ALL_TRIES;
        $groupstudentsjoins = new \core\dml\sql_join();
        [$questions, $quizstats, $questionstats, $qubaids] =
                    $this->check_stats_calculations_and_response_analysis(
                        $csvdata,
                        $whichattempts,
                        $whichtries,
                        $groupstudentsjoins
                    );
        if ($quizsettings['testnumber'] === '00') {
            $this->check_variants_count_for_quiz_00($questions, $questionstats, $whichtries, $qubaids);
            $this->check_quiz_stats_for_quiz_00($quizstats);
        }
    }

    /**
     * Check actual question stats are the same as that found in csv file.
     *
     * @param $qstats         array data from csv file.
     * @param $questionstats  \core_question\statistics\questions\all_calculated_for_qubaid_condition Calculated stats.
     */
    protected function check_question_stats($qstats, $questionstats) {
        foreach ($qstats as $slotqstats) {
            foreach ($slotqstats as $statname => $slotqstat) {
                if (!in_array($statname, ['slot', 'subqname'])  && $slotqstat !== '') {
                    $this->assert_stat_equals(
                        $slotqstat,
                        $questionstats,
                        $slotqstats['slot'],
                        $slotqstats['subqname'],
                        $slotqstats['variant'],
                        $statname
                    );
                }
            }
            // Check that sub-question boolean field is correctly set.
            $this->assert_stat_equals(
                !empty($slotqstats['subqname']),
                $questionstats,
                $slotqstats['slot'],
                $slotqstats['subqname'],
                $slotqstats['variant'],
                'subquestion'
            );
        }
    }

    /**
     * Check that the stat is as expected within a reasonable tolerance.
     *
     * @param float|string|bool $expected expected value of stat.
     * @param \core_question\statistics\questions\all_calculated_for_qubaid_condition $questionstats
     * @param int $slot
     * @param string $subqname if empty string then not an item stat.
     * @param int|string $variant if empty string then not a variantstat.
     * @param string $statname
     */
    protected function assert_stat_equals($expected, $questionstats, $slot, $subqname, $variant, $statname) {

        if ($variant === '' && $subqname === '') {
            $actual = $questionstats->for_slot($slot)->{$statname};
        } else if ($subqname !== '') {
            $actual = $questionstats->for_subq($this->randqids[$slot][$subqname])->{$statname};
        } else {
            $actual = $questionstats->for_slot($slot, $variant)->{$statname};
        }
        $message = "$statname for slot $slot";
        if ($expected === '**NULL**') {
            $this->assertEquals(null, $actual, $message);
        } else if (is_bool($expected)) {
            $this->assertEquals($expected, $actual, $message);
        } else if (is_numeric($expected)) {
            switch ($statname) {
                case 'covariance':
                case 'discriminationindex':
                case 'discriminativeefficiency':
                case 'effectiveweight':
                    $precision = 1e-5;
                    break;
                default:
                    $precision = 1e-6;
            }
            $delta = abs($expected) * $precision;
            $this->assertEqualsWithDelta((float)$expected, $actual, $delta, $message);
        } else {
            $this->assertEquals($expected, $actual, $message);
        }
    }

    /**
     * Assertion helper to check that response counts are as expected.
     *
     * @param $question
     * @param $qubaids
     * @param $expected
     * @param $whichtries
     */
    protected function assert_response_count_equals($question, $qubaids, $expected, $whichtries): void {
        $responesstats = new \core_question\statistics\responses\analyser($question);
        $analysis = $responesstats->load_cached($qubaids, $whichtries);
        if (!isset($expected['subpart'])) {
            $subpart = 1;
        } else {
            $subpart = $expected['subpart'];
        }
        [$subpartid, $responseclassid] = $this->get_response_subpart_and_class_id(
            $question,
            $subpart,
            $expected['modelresponse']
        );

        $subpartanalysis = $analysis->get_analysis_for_subpart($expected['variant'], $subpartid);
        $responseclassanalysis = $subpartanalysis->get_response_class($responseclassid);
        $actualresponsecounts = $responseclassanalysis->data_for_question_response_table('', '');

        foreach ($actualresponsecounts as $actualresponsecount) {
            if ($actualresponsecount->response == $expected['actualresponse'] || count($actualresponsecounts) == 1) {
                $i = 1;
                $partofanalysis = " slot {$expected['slot']}, rand q '{$expected['randq']}', variant {$expected['variant']}, " .
                                    "for expected model response {$expected['modelresponse']}, " .
                                    "actual response {$expected['actualresponse']}";
                while (isset($expected['count' . $i])) {
                    if ($expected['count' . $i] != 0) {
                        $this->assertTrue(
                            isset($actualresponsecount->trycount[$i]),
                            "There is no count at all for try $i on " . $partofanalysis
                        );
                        $this->assertEquals(
                            $expected['count' . $i],
                            $actualresponsecount->trycount[$i],
                            "Count for try $i on " . $partofanalysis
                        );
                    }
                    $i++;
                }
                if (isset($expected['totalcount'])) {
                    $this->assertEquals(
                        $expected['totalcount'],
                        $actualresponsecount->totalcount,
                        "Total count on " . $partofanalysis
                    );
                }
                return;
            }
        }
        throw new \coding_exception("Expected response '{$expected['actualresponse']}' not found.");
    }

    /**
     * Get the subpart id and response class id for a given subpart and model response.
     *
     * @param $question
     * @param $subpart
     * @param $modelresponse
     * @return array
     */
    protected function get_response_subpart_and_class_id($question, $subpart, $modelresponse): array {
        $qtypeobj = question_bank::get_qtype($question->qtype, false);
        $possibleresponses = $qtypeobj->get_possible_responses($question);
        $possibleresponsesubpartids = array_keys($possibleresponses);
        if (!isset($possibleresponsesubpartids[$subpart - 1])) {
            throw new \coding_exception("Subpart '{$subpart}' not found.");
        }
        $subpartid = $possibleresponsesubpartids[$subpart - 1];

        if ($modelresponse == '[NO RESPONSE]') {
            return [$subpartid, null];
        } else if ($modelresponse == '[NO MATCH]') {
            return [$subpartid, 0];
        }

        $modelresponses = [];
        foreach ($possibleresponses[$subpartid] as $responseclassid => $subpartpossibleresponse) {
            $modelresponses[$responseclassid] = $subpartpossibleresponse->responseclass;
        }
        $this->assertContains($modelresponse, $modelresponses);
        $responseclassid = array_search($modelresponse, $modelresponses);
        return [$subpartid, $responseclassid];
    }

    /**
     * Assertion helper to check that response counts are as expected.
     *
     * @param $responsecounts
     * @param $qubaids
     * @param $questions
     * @param $whichtries
     */
    protected function check_response_counts($responsecounts, $qubaids, $questions, $whichtries) {
        foreach ($responsecounts as $expected) {
            $defaultsforexpected = ['randq' => '', 'variant' => '1', 'subpart' => '1'];
            foreach ($defaultsforexpected as $key => $expecteddefault) {
                if (!isset($expected[$key])) {
                    $expected[$key] = $expecteddefault;
                }
            }
            if ($expected['randq'] == '') {
                $question = $questions[$expected['slot']];
            } else {
                $qid = $this->randqids[$expected['slot']][$expected['randq']];
                $question = question_finder::get_instance()->load_question_data($qid);
            }
            $this->assert_response_count_equals($question, $qubaids, $expected, $whichtries);
        }
    }

    /**
     * Assertion helper to check that variant counts are as expected for quiz 00.
     *
     * @param $questions
     * @param $questionstats
     * @param $whichtries
     * @param $qubaids
     */
    protected function check_variants_count_for_quiz_00($questions, $questionstats, $whichtries, $qubaids) {
        $expectedvariantcounts = [2 => [1  => 6,
                                                  4  => 4,
                                                  5  => 3,
                                                  6  => 4,
                                                  7  => 2,
                                                  8  => 5,
                                                  10 => 1]];

        foreach ($questions as $slot => $question) {
            if (!question_bank::get_qtype($question->qtype, false)->can_analyse_responses()) {
                continue;
            }
            $responesstats = new \core_question\statistics\responses\analyser($question);
            $this->assertTimeCurrent($responesstats->get_last_analysed_time($qubaids, $whichtries, [$question->id])[0]);
            $analysis = $responesstats->load_cached($qubaids, $whichtries);
            $variantsnos = $analysis->get_variant_nos();
            if (isset($expectedvariantcounts[$slot])) {
                // Compare contents, ignore ordering of array, using canonicalize parameter of assertEquals.
                $this->assertEqualsCanonicalizing(array_keys($expectedvariantcounts[$slot]), $variantsnos);
            } else {
                $this->assertEquals([1], $variantsnos);
            }
            $totalspervariantno = [];
            foreach ($variantsnos as $variantno) {
                $subpartids = $analysis->get_subpart_ids($variantno);
                foreach ($subpartids as $subpartid) {
                    if (!isset($totalspervariantno[$subpartid])) {
                        $totalspervariantno[$subpartid] = [];
                    }
                    $totalspervariantno[$subpartid][$variantno] = 0;

                    $subpartanalysis = $analysis->get_analysis_for_subpart($variantno, $subpartid);
                    $classids = $subpartanalysis->get_response_class_ids();
                    foreach ($classids as $classid) {
                        $classanalysis = $subpartanalysis->get_response_class($classid);
                        $actualresponsecounts = $classanalysis->data_for_question_response_table('', '');
                        foreach ($actualresponsecounts as $actualresponsecount) {
                            $totalspervariantno[$subpartid][$variantno] += $actualresponsecount->totalcount;
                        }
                    }
                }
            }
            // Count all counted responses for each part of question and confirm that counted responses, for most question types
            // are the number of attempts at the question for each question part.
            if ($slot != 5) {
                // Slot 5 holds a multi-choice multiple question.
                // Multi-choice multiple is slightly strange. Actual answer counts given for each sub part do not add up to the
                // total attempt count.
                // This is because each option is counted as a sub part and each option can be off or on in each attempt. Off is
                // not counted in response analysis for this question type.
                foreach ($totalspervariantno as $totalpervariantno) {
                    if (isset($expectedvariantcounts[$slot])) {
                        // If we know how many attempts there are at each variant we can check
                        // that we have counted the correct amount of responses for each variant.
                        $this->assertEqualsCanonicalizing(
                            $expectedvariantcounts[$slot],
                            $totalpervariantno,
                            "Totals responses do not add up in response analysis for slot {$slot}."
                        );
                    } else {
                        $this->assertEquals(
                            25,
                            array_sum($totalpervariantno),
                            "Totals responses do not add up in response analysis for slot {$slot}."
                        );
                    }
                }
            }
        }

        foreach ($expectedvariantcounts as $slot => $expectedvariantcount) {
            foreach ($expectedvariantcount as $variantno => $s) {
                $this->assertEquals($s, $questionstats->for_slot($slot, $variantno)->s);
            }
        }
    }

    /**
     * Assertion helper to ensure that quiz states are as expected.
     *
     * @param $quizstats
     */
    protected function check_quiz_stats_for_quiz_00($quizstats) {
        $quizstatsexpected = [
            'median'             => 4.5,
            'firstattemptsavg'   => 4.617333332,
            'allattemptsavg'     => 4.617333332,
            'firstattemptscount' => 25,
            'allattemptscount'   => 25,
            'standarddeviation'  => 0.8117265554,
            'skewness'           => -0.092502502,
            'kurtosis'           => -0.7073968557,
            'cic'                => -87.2230935542,
            'errorratio'         => 136.8294900795,
            'standarderror'      => 1.1106813066,
        ];

        foreach ($quizstatsexpected as $statname => $statvalue) {
            $this->assertEqualsWithDelta($statvalue, $quizstats->$statname, abs($statvalue) * 1.5e-5, $quizstats->$statname);
        }
    }

    /**
     * Check the question stats and the response counts used in the statistics report. If the appropriate files exist in fixtures/.
     *
     * @param array $csvdata Data loaded from csv files for this test.
     * @param string $whichattempts
     * @param string $whichtries
     * @param \core\dml\sql_join $groupstudentsjoins
     * @return array with contents 0 => $questions, 1 => $quizstats, 2 => $questionstats, 3 => $qubaids Might be needed for further
     *               testing.
     */
    protected function check_stats_calculations_and_response_analysis(
        $csvdata,
        $whichattempts,
        $whichtries,
        \core\dml\sql_join $groupstudentsjoins
    ) {
        $this->report = new quiz_statistics_report();
        $questions = $this->report->load_and_initialise_questions_for_calculations($this->quiz);
        [$quizstats, $questionstats] = $this->report->get_all_stats_and_analysis(
            $this->quiz,
            $whichattempts,
            $whichtries,
            $groupstudentsjoins,
            $questions
        );

        $qubaids = quiz_statistics_qubaids_condition($this->quiz->id, $groupstudentsjoins, $whichattempts);

        // We will create some quiz and question stat calculator instances and some response analyser instances, just in order
        // to check the last analysed time then returned.
        $quizcalc = new calculator();
        // Should not be a delay of more than one second between the calculation of stats above and here.
        $this->assertTimeCurrent($quizcalc->get_last_calculated_time($qubaids));

        $qcalc = new \core_question\statistics\questions\calculator($questions);
        $this->assertTimeCurrent($qcalc->get_last_calculated_time($qubaids));

        if (isset($csvdata['responsecounts'])) {
            $this->check_response_counts($csvdata['responsecounts'], $qubaids, $questions, $whichtries);
        }
        if (isset($csvdata['qstats'])) {
            $this->check_question_stats($csvdata['qstats'], $questionstats);
            return [$questions, $quizstats, $questionstats, $qubaids];
        }
        return [$questions, $quizstats, $questionstats, $qubaids];
    }
    /**
     * Data provider for quiz statistics with multiple versions of questions.
     *
     * @return array
     */
    public static function quiz_statistics_provider(): array {
        return [
            'truefalse_two_versions' => [
                'config' => [
                    'qtype' => 'truefalse',
                    'which' => null,
                    'slots' => 2,
                    'versions' => 2,
                    'users' => 2,
                    'answers' => [
                        1 => [
                            1 => 'True',
                            2 => 'True',
                        ],
                        2 => [
                            1 => 'False',
                            2 => 'False',
                        ],
                    ],
                    'whichtries' => question_attempt::ALL_TRIES,
                    'whichattempts' => QUIZ_GRADEAVERAGE,
                ],
                'expected' => [
                    1 => [
                        'slot' => 1,
                        's' => 4,
                        'facility' => 0.5,
                        'sd' => 0.5773502691896257,
                        'effectiveweight' => 50.0,
                        'discriminationindex' => 100.0,
                        'positions' => 1,
                        'randomguessscore' => 0.5,
                        'markaverage' => 0.5,
                    ],
                    2 => [
                        'slot' => 2,
                        's' => 4,
                        'facility' => 0.5,
                        'sd' => 0.5773502691896257,
                        'effectiveweight' => 50.0,
                        'discriminationindex' => 100.0,
                        'positions' => 2,
                        'randomguessscore' => 0.5,
                        'markaverage' => 0.5,
                    ],
                ],
            ],
            'calculatedsimple_two_versions' => [
                'config' => [
                    'qtype' => 'calculatedsimple',
                    'which' => 'sumwithvariants',
                    'slots' => 1,
                    'versions' => 2,
                    'users' => 2,
                    'answers' => [
                        1 => [
                            1 => '10',
                        ],
                        2 => [
                            1 => '999',
                        ],
                    ],
                    'whichtries' => question_attempt::ALL_TRIES,
                    'whichattempts' => QUIZ_GRADEAVERAGE,
                ],
                'expected' => [
                    1 => [
                        'slot' => 1,
                        's' => 4,
                        'facility' => 0.0,
                        'sd' => 0.0,
                        'effectiveweight' => null,
                        'discriminationindex' => null,
                        'positions' => 1,
                        'randomguessscore' => 0,
                        'markaverage' => 0.0,
                    ],
                ],
            ],
        ];
    }

    /**
     * Test quiz statistics with multiple versions of questions.
     *
     * @covers ::get_all_stats_and_analysis
     * @param array $config
     * @param array $expected
     * @dataProvider quiz_statistics_provider
     */
    public function test_quiz_statistics_with_multiple_version(array $config, array $expected): void {
        $this->resetAfterTest();

        [$this->quiz] = $this->build_quiz_with_versions($config);
        $this->report = new quiz_statistics_report();
        $questions = $this->report->load_and_initialise_questions_for_calculations($this->quiz);
        $groupstudentsjoins = new \core\dml\sql_join();
        [$quizstats, $questionstats] = $this->report->get_all_stats_and_analysis(
            $this->quiz,
            $config['whichattempts'],
            $config['whichtries'],
            $groupstudentsjoins,
            $questions
        );
        foreach ($expected as $slot => $exp) {
            $stat = $questionstats->questionstats[$slot];
            $this->assertEquals($exp['slot'], $stat->slot);
            $this->assertEquals($exp['s'], $stat->s);
            $this->assertEqualsWithDelta($exp['facility'], $stat->facility, 0.0001);
            $this->assertEqualsWithDelta($exp['sd'], $stat->sd, 0.0001);
            $this->assertEqualsWithDelta($exp['effectiveweight'], $stat->effectiveweight, 0.0001);
            $this->assertEqualsWithDelta($exp['discriminationindex'], $stat->discriminationindex, 0.0001);
            $this->assertEquals($exp['positions'], $stat->positions);
            $this->assertEquals($exp['randomguessscore'], $stat->randomguessscore);
            $this->assertEqualsWithDelta($exp['markaverage'], $stat->markaverage, 0.0001);
            if ($stat->variantstats) {
                $variants = $stat->variantstats;
                $sum = 0;
                foreach ($variants as $variant) {
                    $sum += $variant->s;
                }
                $this->assertEquals($stat->s, $sum);
            }
        }
    }

    /**
     * Build a quiz with multiple versions of questions and simulate attempts.
     *
     * @param array $config
     * @return array [$quiz]
     */
    protected function build_quiz_with_versions(array $config): array {
        /** @var \mod_quiz_generator $quizgenerator */
        $quizgenerator = $this->getDataGenerator()->get_plugin_generator('mod_quiz');
        /** @var \core_question_generator $questiongenerator */
        $questiongenerator = $this->getDataGenerator()->get_plugin_generator('core_question');
        // Users.
        $users = [];
        for ($u = 0; $u < $config['users']; $u++) {
            $users[] = $this->getDataGenerator()->create_user();
        }
        $this->course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($this->course->id);
        $cat = $questiongenerator->create_question_category([
            'name' => 'Test category',
            'context' => $coursecontext->id,
        ]);
        // Create base questions (version 1).
        $questions = [];
        for ($slot = 1; $slot <= $config['slots']; $slot++) {
            $q = $questiongenerator->create_question(
                $config['qtype'],
                $config['which'],
                ['category' => $cat->id]
            );
            $questions[$slot] = $q;
        }

        $quiz = $quizgenerator->create_instance([
            'course' => $this->course->id,
            'grade' => 100,
            'sumgrades' => $config['slots'],
            'preferredbehaviour' => 'immediatefeedback',
        ]);

        foreach ($questions as $q) {
            quiz_add_quiz_question($q->id, $quiz);
        }

        // Chronological version loop.
        for ($version = 1; $version <= $config['versions']; $version++) {
            foreach ($users as $user) {
                $this->setUser($user);
                $quizobj = quiz_settings::create($quiz->id);
                $attemptnumber = quiz_get_user_attempts($quiz->id, $user->id, 'all', true);
                $attemptnumber = count($attemptnumber) + 1;
                $attempt = quiz_prepare_and_start_new_attempt($quizobj, $attemptnumber, null);
                $attemptobj = quiz_attempt::create($attempt->id);
                $postdata = $questiongenerator
                    ->get_simulated_post_data_for_questions_in_usage(
                        $attemptobj->get_question_usage(),
                        $config['answers'][$version],
                        true
                    );
                $timenow = time();
                $attemptobj->process_submitted_actions($timenow, false, $postdata);
                $attemptobj->process_submit($timenow, false);
                $attemptobj->process_grade_submission($timenow);
            }
            // Create next version.
            if ($version < $config['versions']) {
                foreach ($questions as $q) {
                    $questiongenerator->update_question($q, $config['which']);
                }
            }
        }
        return [$quiz];
    }
}
