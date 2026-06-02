@qtype @qtype_essay
Feature: Essay question minimum attachment count
  In order to be informed of file attachment requirements
  As a student
  I need to see the minimum number of files required and validation errors when I submit too few

  Background:
    Given the following "users" exist:
      | username |
      | teacher  |
      | student  |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user    | course | role           |
      | teacher | C1     | editingteacher |
      | student | C1     | student        |
    And the following "question categories" exist:
      | contextlevel | reference | name           |
      | Course       | C1        | Test questions |
    And the following "questions" exist:
      | questioncategory | qtype | name        | template | attachments | attachmentsrequired |
      | Test questions   | essay | essay-min-2 | editor   | 3           | 2                   |
      | Test questions   | essay | essay-min-0 | editor   | 3           | 0                   |
    And the following "activities" exist:
      | activity | name   | intro | course | idnumber | grade |
      | quiz     | Quiz 1 | Quiz  | C1     | quiz1    | 100   |
    And quiz "Quiz 1" contains the following questions:
      | question    | page |
      | essay-min-2 | 1    |

  @javascript
  Scenario: Minimum attachment count hint appears in file picker area when required
    When I am on the "essay-min-2" "core_question > preview" page logged in as teacher
    Then I should see "Minimum number of files: 2; maximum: 3"

  @javascript
  Scenario: No minimum hint when attachmentsrequired is 0
    When I am on the "essay-min-0" "core_question > preview" page logged in as teacher
    Then I should not see "Minimum number of files"

  @javascript
  Scenario: Validation error appears when student saves with too few attachments
    Given I am on the "Quiz 1" "quiz activity" page logged in as "student"
    And I press "Attempt quiz"
    When I set the field "Answer" to "This is my answer"
    Then I should see "Minimum number of files: 2; maximum: 3"
    And I press "Finish attempt ..."
    And I should see "Incomplete answer. Expected files: 2; actual files: 0"
    And I press "Return to attempt"
    And I should see "Expected files: 2; actual files: 0"
    And I set the field "Answer" to "This is my answer"
    And I press "Finish attempt ..."
    And I press "Submit all and finish"
    And I click on "Submit all and finish" "button" in the "Submit all your answers and finish?" "dialogue"
    And I should not see "Expected files: 2; actual files: 0"
