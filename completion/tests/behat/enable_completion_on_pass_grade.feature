@core @core_completion
Feature: Students will be marked as completed if they have achieved a passing grade.

  Background:
    Given the following "courses" exist:
      | fullname | shortname | category | enablecompletion |
      | Course 1 | C1        | 0        | 1                |
    And the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | Frist    | teacher1@example.com |
      | student1 | Student   | First    | student1@example.com |
      | student2 | Student   | Second   | student2@example.com |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
    And the following "activity" exists:
      | idnumber                            | a1                      |
      | activity                            | assign                  |
      | course                              | C1                      |
      | name                                | Test assignment name    |
      | intro                               | Submit your online text |
      | assignsubmission_onlinetext_enabled | 1                       |
      | assignsubmission_file_enabled       | 0                       |
      | completion                          | 2                       |
      | completionpassgrade                 | 1                       |
      | completionusegrade                  | 1                       |
      | gradepass                           | 50                      |
    And I log in as "teacher1"
    And I am on "Course 1" course homepage
    And "Student First" user has not completed "Test assignment name" activity
    And I log out

  Scenario Outline: Passing grade completion even if we have unlock completion and re-grade.
    Given I am on the "Course 1" course page logged in as teacher1
    And I navigate to "View > Grader report" in the course gradebook
    And I turn editing mode on
    And I give the grade "21" to the user "Student First" for the grade item "Test assignment name"
    And I give the grade "50" to the user "Student Second" for the grade item "Test assignment name"
    And I press "Save changes"
    And I log out
    When I am on the "Test assignment name" "assign activity" page logged in as student1
    And I am on "Course 1" course homepage
    Then the "Receive a grade" completion condition of "Test assignment name" is displayed as "done"
    And the "Receive a passing grade" completion condition of "Test assignment name" is displayed as "failed"
    And I log out
    When I am on the "Test assignment name" "assign activity" page logged in as student2
    And I am on "Course 1" course homepage
    Then the "Receive a grade" completion condition of "Test assignment name" is displayed as "done"
    And the "Receive a passing grade" completion condition of "Test assignment name" is displayed as "done"
    When I am on the "Test assignment name" "assign activity" page logged in as teacher1
    And I navigate to "Settings" in current page administration
    And I expand all fieldsets
    And I press "Unlock completion options"
    And I expand all fieldsets
    Then I should see "Completion options unlocked"
    And I set the following fields to these values:
      | completion          | 2  |
      | completionpassgrade | 1  |
      | completionusegrade  | 1  |
      | gradepass           | 10 |
    And I click on "Save and display" "button"
    When I am on the "Course 1" course page logged in as student1
    Then the "Receive a grade" completion condition of "Test assignment name" is displayed as "done"
    And the "Receive a passing grade" completion condition of "Test assignment name" is displayed as "done"
    When I am on the "Course 1" course page logged in as student2
    Then the "Receive a grade" completion condition of "Test assignment name" is displayed as "done"
    And the "Receive a passing grade" completion condition of "Test assignment name" is displayed as "done"
    When I am on the "Course 1" course page logged in as teacher1
    Then I navigate to "Reports > Activity completion" in current page administration
    And "<expectedactivitycompletion>" "icon" should exist in the "Student First" "table_row"
    And "<expectedactivitycompletion>" "icon" should exist in the "Student Second" "table_row"

    Examples:
      | expectedactivitycompletion             |
      | Completed (achieved pass grade)        |
