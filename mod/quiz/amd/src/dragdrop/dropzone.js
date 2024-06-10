import {BaseComponent, DragDrop} from 'core/reactive';
import Selectors from 'mod_quiz/dragdrop/selectors';

export default class extends BaseComponent {
    /**
     * The state is ready.
     */
    stateReady() {
        this.dragdrop = new DragDrop(this);
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
     * Validate draggable data.
     *
     * @param {HTMLElement} dropdata Drop element.
     * @returns {boolean} if the data is valid for this drop-zone.
     */
    validateDropData(dropdata) {
        // Do not allow element drop to itself.
        if (this.element.id == dropdata.id) {
            this.element.classList.remove('drop-zone');
            return false;
        } else {
            return true;
        }
    }



    /**
     * Executed when a valid dropdata is dropped over the drop-zone.
     *
     * @param {HTMLElement} dropdata Drop element.
     */
    drop(dropdata) {
        let dropZoneNode = this.element;
        // If the dropzone is a section. We will drop the first question of the page.
        if (this.element.classList.contains('section')) {
            dropZoneNode = this.element.querySelector(Selectors.QUESTION);
        }
        // If the dropzone is a page title. We will drop the first question of the page.
        if (this.element.classList.contains('page')) {
            dropZoneNode = this.element.parentNode.querySelector(Selectors.QUESTION);
        }
        this.reactive.dispatch('moveQuestion', dropdata, dropZoneNode);

    }

    /**
     * Optional method to show some visual hints to the user.
     */
    showDropZone() {
        this.element.classList.add('drop-zone');
    }

    /**
     * Optional method to remove visual hints to the user.
     */
    hideDropZone() {
        this.element.classList.remove('drop-zone');
    }
}