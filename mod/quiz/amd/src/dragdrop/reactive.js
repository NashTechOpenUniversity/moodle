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
 * Reactive instance for mod_quiz/dragdrop.
 *
 * @module    mod_quiz/dragdrop/reactive
 * @copyright 2024 The Open University
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {Reactive} from 'core/reactive';
import {SELECTORS} from 'mod_quiz/dragdrop/selectors';

export default class extends Reactive {

    /**
     * Set initial state for all the questions.
     */
    async loadQuizDragDrop() {

        const questions = document.querySelectorAll(SELECTORS.QUESTION);
        let initialData = [];
        questions.forEach((question) => {
            initialData.push({id: question.id, ismove: false});
        });
        this.setInitialState({question: initialData});
    }
}