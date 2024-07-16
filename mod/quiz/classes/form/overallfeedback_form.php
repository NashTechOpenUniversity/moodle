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
 * Defines the editing form for overall feedbacks.
 *
 * @package    mod_quiz
 * @copyright  2024 The Open University
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace mod_quiz\form;

use GeoIp2\Record\Continent;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot.'/lib/formslib.php');

/**
 * Class overallfeedback_form.
 *
 * @package    mod_quiz
 * @copyright  2024 The Open University
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class overallfeedback_form extends \moodleform {

    /**
     * Form definiton.
     */
    public function definition() {
        global $OUTPUT;
        $mform = $this->_form;
        $customdata = $this->_customdata;
        $context = $customdata['context'];
        $feedbacks = $customdata['feedbacks'];
        $mform->addElement('static', 'gradeboundarystatic1',
            get_string('gradeboundary', 'quiz'), '100%');
        $mform->addElement('editor',
            "feedbacktext[0][text]", get_string('feedback', 'quiz'), ['rows' => 3],
            ['maxfiles' => EDITOR_UNLIMITED_FILES, 'noclean' => true,
                'context' => $context]);
        $dividertemplate = $OUTPUT->render_from_template('mod_quiz/divider_feedback', ['afterindex' => 0]);
        $mform->addElement('html', $dividertemplate);

        $index = 0;
        foreach ($feedbacks as $feedback) {
            $mform->addElement('text', "feedbackboundaries[$index]",
                get_string('gradeboundary', 'quiz'), ['size' => 10]);
            $mform->addElement('editor',
                'feedbacktext[' . $index + 1 . '][text]', get_string('feedback', 'quiz'), ['rows' => 3],
                ['maxfiles' => EDITOR_UNLIMITED_FILES, 'noclean' => true,
                    'context' => $context]);
            $dividertemplate = $OUTPUT->render_from_template('mod_quiz/divider_feedback', ['afterindex' => $index + 1]);
            $mform->addElement('html', $dividertemplate);
            $index++;
        }

        $mform->addElement('static',
            'gradeboundarystatic2', get_string('gradeboundary', 'quiz'), '0%');
    }

    function set_data($default_values) {
        if (is_object($default_values)) {
            $default_values = (array)$default_values;
        }

        $this->data_preprocessing($default_values);
        parent::set_data($default_values);
    }

    public function data_preprocessing() {

    }
}
