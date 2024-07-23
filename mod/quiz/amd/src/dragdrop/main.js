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
 * JavaScript for initializer the reactive drag drop of the question editing page.
 *
 * @module    mod_quiz/dragdrop/main
 * @copyright 2024 The Open University
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Reactive from 'mod_quiz/dragdrop/reactive';
import QuizDDMutations from 'mod_quiz/dragdrop/mutations';
import QuizDragDropParent from 'mod_quiz/dragdrop/quizdragdropparent';

const stateChangedEventName = 'mod_quiz_dragdrop:stateChanged';
/**
 * Create reactive instance for quiz dragdrop, load initial state.
 * @param {string} domElementId Id of render container
 * @param {number} quizId Quiz id
 * @param {number} courseId Id of the
 * @returns {QuizDragDropParent}
 */
export const initDragDrop = (domElementId, quizId, courseId) => {
    const reactiveInstance = new Reactive({
        name: 'mod_quiz_dragdrop' + quizId,
        eventName: stateChangedEventName,
        eventDispatch: dispatchQuizDragDropEvent,
        target: document.getElementById(domElementId),
        mutations: new QuizDDMutations(),
    });
    reactiveInstance.loadQuizDragDrop(quizId, courseId);
    return new QuizDragDropParent({
        element: document.getElementById(domElementId),
        reactive: reactiveInstance,
        quizid: quizId,
        courseid: courseId,
    });
};

/**
 * Internal state changed event.
 *
 * @param {object} detail the full state
 * @param {object} target the custom event target (document if none provided)
 */
function dispatchQuizDragDropEvent(detail, target) {
    if (target === undefined) {
        target = document;
    }
    target.dispatchEvent(
        new CustomEvent(
            stateChangedEventName,
            {
                bubbles: true,
                detail: detail,
            }
        )
    );
}