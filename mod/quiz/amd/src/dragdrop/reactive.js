import {Reactive} from 'core/reactive';
import Selectors from 'mod_quiz/dragdrop/selectors';

/**
 * Reactive instance for mod_quiz_dragdrop.
 */
export default class extends Reactive {

    /**
     * Set initial state for all the questions.
     */
    async loadQuizDragDrop() {

        const questions = document.querySelectorAll(Selectors.QUESTION);
        let initialData = [];
        questions.forEach((question) => {
            initialData.push({id: question.id, ismove: false}, );
        });
        this.setInitialState({question: initialData});
    }
}