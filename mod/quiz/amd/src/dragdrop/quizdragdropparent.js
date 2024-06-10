import {BaseComponent} from 'core/reactive';
import Selectors from 'mod_quiz/dragdrop/selectors';
import dragDropElement from 'mod_quiz/dragdrop/dragdrop';
import dropZoneElement from 'mod_quiz/dragdrop/dropzone';

/**
 * Parent component for all kanban boards of this quiz.
 */
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
        const sections = this.getElements(Selectors.SECTION);
        const questions = this.getElements(Selectors.QUESTION);
        const pageheadings = this.getElements(Selectors.PAGE);
        sections.forEach((section) => {
            new dropZoneElement({
                element: section,
                reactive: this.reactive,
            });
        });
        pageheadings.forEach((page) => {
            new dropZoneElement({
                element: page,
                reactive: this.reactive,
            });
        });
        questions.forEach((question) => {
            new dropZoneElement({
                element: question,
                reactive: this.reactive,
                quizid: this.reactive.quizid,
                courseid : this.reactive.courseid,
            });
            new dragDropElement({
                element: question.querySelector(Selectors.MOVE_ACTION),
                reactive: this.reactive,
                quizid: this.quizid,
                courseid : this.courseid,
                id: question.id,
            });
        });
    }
}