import Ajax from 'core/ajax';
import Selectors from 'mod_quiz/dragdrop/selectors';
import {util} from 'mod_quiz/quiz_utils';

/**
 * Mutations library for mod_quiz_dragdrop.
 * The functions are just used to forward data to the webservice.
 */
export default class {

    /**
     * Moves a question to a new place.
     *
     * @param {*} stateManager StateManager instance
     * @param {Object} dragData Id of the column to move
     * @param {Element} dropZoneNode Id ofthe column before (0 means to insert at the left of the board)
     */
    async moveQuestion(stateManager, dragData, dropZoneNode) {
        let previousPage;
        let previousSlotId = 0;
        let previousNode;
        const goingUp = dragData.slotorder > dropZoneNode.dataset.slotorder;
        if (goingUp) {
            previousNode = dropZoneNode.previousSibling;
        } else {
            previousNode = dropZoneNode;
        }

        if (previousNode.id.includes('page')) {
            previousPage = util.getNumber(previousNode.id);
        } else {
            previousPage = previousNode.dataset.page;
            previousSlotId = util.getNumber(previousNode.id);
        }

        const result = await this._moveQuestionToSlot(dragData.quizid, util.getNumber(dragData.id),
            util.getNumber(dropZoneNode.closest(Selectors.MAIN_SECTION).id), previousSlotId, previousPage);
        this.processUpdates(stateManager, result, dropZoneNode, dragData, goingUp);
    }

    /**
     * Move question to a new slot.
     *
     * @param {Number} quizid
     * @param {Number} slotid
     * @param {Number} sectionid
     * @param {Number} previousslotid
     * @param {Number} page
     * @returns {Promise<*>}
     * @private
     */
    async _moveQuestionToSlot(quizid, slotid, sectionid, previousslotid, page) {
        return Ajax.call([{
            methodname: 'mod_quiz_move_slot',
            args: {
                quizid: quizid,
                id: slotid,
                sectionid: sectionid,
                previousid: previousslotid,
                page: page,
            },
        }])[0];
    }

    /**
     *
     * Update state object.
     *
     * @param stateManager
     * @param result
     * @param dropZoneNode
     * @param dragData
     * @param goingup
     */
    async processUpdates(stateManager, result, dropZoneNode , dragData, goingup) {
        if (result.visible) {
            const updateUI = {
                name: 'question',
                action: 'put',
                fields: {
                    id: dragData.id,
                    ismove: true,
                    goingup: goingup,
                    dropzoneslotorder: dropZoneNode.dataset.slotorder,
                    dragslotoder: dragData.slotorder,
                    previousslotid: dropZoneNode.id,
                }
            };
            // The first update to change state object to update the UI in the front-end.
            stateManager.processUpdates([updateUI]);
            const revertIsMoveState = {
                name: 'question',
                action: 'put',
                fields: {
                    id: dragData.id,
                    ismove: false,
                }
            };
            // The second update just revert back the ismove state.
            stateManager.processUpdates([revertIsMoveState]);

        }
    }
}