import Reactive from 'mod_quiz/dragdrop/reactive';
import QuizDDMutations from 'mod_quiz/dragdrop/mutations';
import QuizDragDropParent from 'mod_quiz/dragdrop/quizdragdropparent';

const stateChangedEventName = 'mod_quiz_dragdrop:stateChanged';
/**
 * Create reactive instance for quiz dragdrop, load initial state.
 * @param {string} domElementId Id of render container
 * @param {number} quizId Course module id of the kanban board
 * @param {number} courseId Id of the board to display
 * @returns {KanbanComponent}
 */
export const init = (domElementId, quizId, courseId) => {
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
        courseid : courseId,
    });
};

/**
 * Internal state changed event.
 *
 * @method dispatchKanbanEvent
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