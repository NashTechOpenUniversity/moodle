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
 * JavaScript for the add_random_form class.
 *
 * @module    mod_quiz/add_random_form
 * @copyright 2018 Ryan Wyllie <ryan@moodle.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {BaseComponent, DragDrop} from 'core/reactive';
import {initResourceToolbox} from 'mod_quiz/quiz_toolboxes';
import Selectors from 'mod_quiz/dragdrop/selectors';
import {util} from 'mod_quiz/quiz_utils';

export default class extends BaseComponent {

    /**
     * Called after the component was created.
     *
     * @param {Object} descriptor
     */
    create(descriptor) {

        /**
         * Called after the component was created.
         */
        this.id = descriptor.id;
        this.quizid = descriptor.quizid;
        this.courseid = descriptor.courseid;
    }

    /**
     * The state is ready.
     */
    stateReady() {
        this.dragdrop = new DragDrop(this);
    }

    /**
     * Watchers for this component.
     * @returns {array} All watchers for this component
     */
    getWatchers() {
        return [
            {watch: `question:updated`, handler: this._slotUpdated},
        ];
    }

    /**
     * Remove all subcomponents dependencies.
     */
    destroy() {
        // The draggable element must be unregistered.
        if (this.dragdrop !== undefined) {
            this.dragdrop.unregister();
        }
    }

    /**
     * Update the UI after slot is updated.
     *
     * @param {Object} element
     * @private
     */
    _slotUpdated(element) {
        if (element.element.id == this.id && element.element.ismove) {
            const dragElement = document.getElementById(element.element.id);
            const dropZoneElement = document.getElementById(element.element.previousslotid);

            dropZoneElement.parentNode.insertBefore(dragElement,
                element.element.goingup ? dropZoneElement : dropZoneElement.nextSibling);
            initResourceToolbox(this.courseid, this.quizid, false).reorganiseEditPage();
        }
    }

    /**
     * Get the draggable data of this component.
     *
     * @returns {Object} the draggable data.
     */
    getDraggableData() {
        // This data will be passed to the drop-zones.
        const element = document.getElementById(this.id);
        const sectionId = util.getNumber(element.closest(Selectors.MAIN_SECTION).id);

        return {id: this.id, slotorder: element.dataset.slotorder, page: element.dataset.page,
            courseid: this.courseid, quizid: this.quizid, sectionid: sectionId};
    }
}