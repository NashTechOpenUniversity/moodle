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
 * JavaScript for parent component for all question in quiz editing page.
 *
 * @module    mod_quiz/dragdrop/quizdragdropparent
 * @copyright 2024 The Open University
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {BaseComponent} from 'core/reactive';
import {SELECTORS} from 'mod_quiz/dragdrop/selectors';
import DragDropElement from 'mod_quiz/dragdrop/dragdrop';
import DropZoneElement from 'mod_quiz/dragdrop/dropzone';
import {dragdropUtils as DDUtils} from 'mod_quiz/dragdrop/dragdrop_utils';

export default class extends BaseComponent {

    /**
     * Function to initialize component, called by mustache template.
     * @param {*} target The id of the HTMLElement to attach to
     * @param {*} reactiveInstance The reactive instance for the component
     * @returns {BaseComponent} New component attached to the HTMLElement represented by target
     */
    static init(target, reactiveInstance) {
        return new this({
            element: document.getElementById(target),
            reactive: reactiveInstance,
        });
    }

    /**
     * Called after the component was created.
     *
     * @param {Object} descriptor Descriptor data.
     */
    create(descriptor) {
        this.quizid = descriptor.quizid;
        this.courseid = descriptor.courseid;
        this.id = this.element.dataset.id;
    }

    /**
     * Called once when state is ready, attaching event listeners and initializing drag and drop.
     */
    async stateReady() {
        const questions = this.getElements(SELECTORS.QUESTION);
        const pageHeadings = this.getElements(SELECTORS.PAGE);
        const dragDropElementList = [];
        pageHeadings.forEach((page) => {
            new DropZoneElement({
                element: page,
                reactive: this.reactive,
            });
        });
        questions.forEach((question) => {
            new DropZoneElement({
                element: question,
                reactive: this.reactive,
                quizid: this.reactive.quizid,
                courseid: this.reactive.courseid,
            });
            dragDropElementList.push(new DragDropElement({
                element: question.querySelector(SELECTORS.MOVE_ACTION),
                reactive: this.reactive,
                quizid: this.quizid,
                courseid: this.courseid,
                id: question.id,
            }));
            const container = this;
            const moveAction = question.querySelector(SELECTORS.MOVE_ACTION);
            moveAction.addEventListener('click', (event) => DDUtils.handleMoveAction(event, container, dragDropElementList));
            moveAction.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    DDUtils.handleMoveAction(event, container, dragDropElementList);
                }
            });

        });
    }
}