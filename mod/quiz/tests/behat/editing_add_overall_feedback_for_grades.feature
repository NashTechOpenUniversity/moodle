@mod @mod_quiz
Feature: Setup multiple grades for a quiz with overall feedback
  In order to add feedback for each grade items
  As a teacher
  I need to be able to add overall feedback to grade items.

  Background:
    Given the following "users" exist:
      | username |
      | teacher  |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user    | course | role           |
      | teacher | C1     | editingteacher |
    And the following "question categories" exist:
      | contextlevel | reference | name           |
      | Course       | C1        | Test questions |
    And the following "questions" exist:
      | questioncategory | qtype       | name       | questiontext        |
      | Test questions   | description | Info       | Some information    |
      | Test questions   | truefalse   | Question A | This is question 01 |
      | Test questions   | truefalse   | Question B | This is question 02 |
    And the following "activities" exist:
      | activity | name   | course |
      | quiz     | Quiz 1 | C1     |

  @javascript
  Scenario: Navigation to, and display of, grading overall feedbacks.
    Given the following "mod_quiz > grade items" exist:
      | quiz   | name      |
      | Quiz 1 | Intuition |
    When I am on the "Quiz 1" "mod_quiz > multiple grades setup" page logged in as teacher
    Then I should see "Grade items"
    And I open the action menu in "Intuition" "table_row"
    And I should see "Add overall feedback" in the "Intuition" "table_row"

  @javascript
  Scenario: Add overall feedback and verify that the label menu item has changed.
    Given the following "mod_quiz > grade items" exist:
      | quiz   | name      |
      | Quiz 1 | Intuition |
    When I am on the "Quiz 1" "mod_quiz > multiple grades setup" page logged in as teacher
    Then I should see "Grade items"
    And I open the action menu in "Intuition" "table_row"
    And I click on "Add overall feedback" "link" in the "Intuition" "table_row"
    And I wait until "Feedback" "text" exists
    And I wait "1" seconds
    And I set the value "Hello" as the feedback for the boundary "100%" in the grade item "Intuition"
    And I click on "Save" "button"
    And I wait until "Grade boundary" "text" exists
    And I should see "less than or equal 100%"
    And I should see "Hello"
    And I open the action menu in "Intuition" "table_row"
    And I should see "Edit overall feedback" in the "Intuition" "table_row"

  @javascript
  Scenario: Add overall feedback with several boundary options.
    Given the following "mod_quiz > grade items" exist:
      | quiz   | name      |
      | Quiz 1 | Intuition |
    And quiz "Quiz 1" contains the following questions:
      | question   | page |
      | Question A | 1    |
    When I am on the "Quiz 1" "mod_quiz > multiple grades setup" page logged in as teacher
    And I set the field "Question A" to "Intuition"
    Then I should see "Grade items"
    And I open the action menu in "Intuition" "table_row"
    And I click on "Add overall feedback" "link" in the "Intuition" "table_row"
    And I wait until "Feedback" "text" exists
    And I add more feedback in the grade item "Intuition"
    And I set the boundary field "feedbackboundaries[0]" to "80%" in the grade item "Intuition"
    And I set the value "Feedback 100%" as the feedback for the boundary "100%" in the grade item "Intuition"
    And I set the value "Feedback 80%" as the feedback for the boundary "80%" in the grade item "Intuition"
    And I click on "Save" "button"
    And I wait until "Grade boundary" "text" exists
    And I should see "less than or equal 100%"
    And I should see "Feedback 100%"
    And I should see "less than 80%"
    And I should see "Feedback 80%"
    And I am on the "Quiz 1" "mod_quiz > View" page
    And I press "Preview quiz"
    And I click on "False" "radio"
    And I click on "Finish attempt ..." "button"
    And I press "Submit all and finish"
    And I click on "Submit" "button" in the "Submit all your answers and finish?" "dialogue"
    And I should see "Feedback Intuition"
    And I should see "Feedback 80%"

  @javascript
  Scenario: An overall feedback will be shown corresponding to the grade item boundary setup.
    Given the following "mod_quiz > grade items" exist:
      | quiz   | name      |
      | Quiz 1 | Intuition |
    And quiz "Quiz 1" contains the following questions:
      | question   | page |
      | Question A | 1    |
    When I am on the "Quiz 1" "mod_quiz > multiple grades setup" page logged in as teacher
    And I set the field "Question A" to "Intuition"
    And I open the action menu in "Intuition" "table_row"
    And I click on "Add overall feedback" "link" in the "Intuition" "table_row"
    And I wait until "Feedback" "text" exists
    And I wait "1" seconds
    And I set the value "Hello" as the feedback for the boundary "100%" in the grade item "Intuition"
    And I click on "Save" "button"
    And I am on the "Quiz 1" "mod_quiz > View" page
    And I press "Preview quiz"
    And I click on "False" "radio"
    And I click on "Finish attempt ..." "button"
    And I press "Submit all and finish"
    And I click on "Submit" "button" in the "Submit all your answers and finish?" "dialogue"
    Then I should see "Feedback Intuition"
    And I should see "Hello"
