@mod @mod_quiz @core_completion
Feature: Activity completion in the quiz activity with unlocked and re-grading.
  In order to have visibility of quiz completion requirements
  As a student
  I need to be able to view my quiz completion progress even teacher have re-grading the grade pass.

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | 1        | student1@example.com |
      | teacher1 | Teacher   | 1        | teacher1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category | enablecompletion |
      | Course 1 | C1        | 0        | 1                |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | student1 | C1     | student        |
    And the following config values are set as admin:
      | grade_item_advanced | hiddenuntil |
    And the following "question categories" exist:
      | contextlevel | reference | name           |
      | Course       | C1        | Test questions |
    And the following "questions" exist:
      | questioncategory | qtype     | name            | questiontext               | defaultmark |
      | Test questions   | truefalse | First question  | Answer the first question  | 8           |
      | Test questions   | truefalse | Second question | Answer the second question | 2           |
    And the following "activity" exists:
      | activity            | quiz           |
      | course              | C1             |
      | idnumber            | quiz1          |
      | name                | Test quiz name |
      | section             | 1              |
      | gradepass           | 10.00          |
      | grade               | 10             |
      | grademethod         | 1              |
      | completion          | 2              |
      | completionusegrade  | 1              |
      | completionpassgrade | 1              |
    And quiz "Test quiz name" contains the following questions:
      | question        | page |
      | First question  | 1    |
      | Second question | 2    |

  @javascript
  Scenario Outline: Student will receive correct completion even when teacher unlocked completion and re-grading.
    # Highest grade.
    When I am on the "Test quiz name" "quiz activity" page logged in as student1
    And the "Receive a grade" completion condition of "Test quiz name" is displayed as "<todocompletionexpected>"
    And the "Receive a passing grade" completion condition of "Test quiz name" is displayed as "<todocompletionexpected>"
    And user "student1" has attempted "Test quiz name" with responses:
      | slot | response |
      | 1    | True     |
      | 2    | False    |
    And I am on "Course 1" course homepage
    And I follow "Test quiz name"
    And the "Receive a grade" completion condition of "Test quiz name" is displayed as "<passcompletionexpected>"
    And the "Receive a passing grade" completion condition of "Test quiz name" is displayed as "<failcompletionexpected>"
    And I press "Re-attempt quiz"
    And I set the field "<answer>" to "1"
    And I press "Next page"
    And I set the field "<answer>" to "1"
    And I press "Finish attempt ..."
    And I press "Submit all and finish"
    And I click on "Submit all and finish" "button" in the "Confirmation" "dialogue"
    And I follow "Finish review"
    And the "Receive a grade" completion condition of "Test quiz name" is displayed as "<passcompletionexpected>"
    And the "Receive a passing grade" completion condition of "Test quiz name" is displayed as "<passcompletionexpected>"
    And I log out
    # Average grade.
    When I am on the "Test quiz name" "quiz activity" page logged in as teacher1
    And I navigate to "Settings" in current page administration
    And I expand all fieldsets
    And I press "Unlock completion options"
    And I expand all fieldsets
    Then I should see "Completion options unlocked"
    And I set the following fields to these values:
      | gradepass   | 10 |
      | grademethod | 2  |
    And I click on "Save and display" "button"
    And I should see "Grading method: Average grade"
    And I am on "Course 1" course homepage
    Then I navigate to "Reports > Activity completion" in current page administration
    And "<failactivitycompletion>" "icon" should exist in the "Student 1" "table_row"
    When I am on the "Course 1" course page logged in as student1
    Then the "Receive a grade" completion condition of "Test quiz name" is displayed as "<passcompletionexpected>"
    And the "Receive a passing grade" completion condition of "Test quiz name" is displayed as "<failcompletionexpected>"
    # First attempt.
    When I am on the "Test quiz name" "quiz activity" page logged in as teacher1
    And I navigate to "Settings" in current page administration
    And I expand all fieldsets
    And I press "Unlock completion options"
    And I expand all fieldsets
    Then I should see "Completion options unlocked"
    And I set the following fields to these values:
      | gradepass   | 8 |
      | grademethod | 3 |
    And I click on "Save and display" "button"
    And I should see "Grading method: First attempt"
    And I am on "Course 1" course homepage
    Then I navigate to "Reports > Activity completion" in current page administration
    And "<passactivitycompletion>" "icon" should exist in the "Student 1" "table_row"
    When I am on the "Course 1" course page logged in as student1
    Then the "Receive a grade" completion condition of "Test quiz name" is displayed as "<passcompletionexpected>"
    And the "Receive a passing grade" completion condition of "Test quiz name" is displayed as "<passcompletionexpected>"
    # Last attempt.
    When I am on the "Test quiz name" "quiz activity" page logged in as teacher1
    And I navigate to "Settings" in current page administration
    And I expand all fieldsets
    And I press "Unlock completion options"
    And I expand all fieldsets
    Then I should see "Completion options unlocked"
    And I set the following fields to these values:
      | gradepass   | 10 |
      | grademethod | 4  |
    And I click on "Save and display" "button"
    And I should see "Grading method: Last attempt"
    And I am on "Course 1" course homepage
    Then I navigate to "Reports > Activity completion" in current page administration
    And "<passactivitycompletion>" "icon" should exist in the "Student 1" "table_row"
    When I am on the "Course 1" course page logged in as student1
    Then the "Receive a grade" completion condition of "Test quiz name" is displayed as "<passcompletionexpected>"
    And the "Receive a passing grade" completion condition of "Test quiz name" is displayed as "<passcompletionexpected>"

    Examples:
      | answer | todocompletionexpected | passcompletionexpected | failcompletionexpected | passactivitycompletion          | failactivitycompletion                 |
      | True   | todo                   | done                   | failed                 | Completed (achieved pass grade) | Completed (did not achieve pass grade) |
