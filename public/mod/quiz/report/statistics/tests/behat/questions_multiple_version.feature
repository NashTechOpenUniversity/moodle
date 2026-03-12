@mod @mod_quiz @quiz @quiz_statistics
Feature: Advance use of the Statistics report
  In order to see how my students are progressing
  As a teacher
  I need to see all their quiz responses in the statistics report for each question version when questions have been updated.

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | 1        | teacher1@example.com |
      | student1 | Student   | 1        | student1@example.com |
      | student2 | Student   | 2        | student2@example.com |
      | student3 | Student   | 3        | student3@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
      | student3 | C1     | student        |
    And the following "question categories" exist:
      | contextlevel | reference | name           |
      | Course       | C1        | Test questions |
    And the following "activities" exist:
      | activity | name   | course | idnumber |
      | quiz     | Quiz 1 | C1     | quiz1    |

  @javascript
  Scenario: Report with normal questions with multiple versions
    Given the following "questions" exist:
      | questioncategory | qtype     | name       | questiontext        |
      | Test questions   | truefalse | Question A | This is question 01 |
      | Test questions   | truefalse | Question B | This is question 02 |
      | Test questions   | truefalse | Question C | This is question 03 |
    And quiz "Quiz 1" contains the following questions:
      | question   | page | displaynumber |
      | Question A | 1    |               |
      | Question B | 1    |               |
      | Question C | 2    | 3c            |
    And user "student1" has attempted "Quiz 1" with responses:
      | slot | response |
      | 1    | True     |
      | 2    | False    |
      | 3    | False    |
    And user "student2" has attempted "Quiz 1" with responses:
      | slot | response |
      | 1    | True     |
      | 2    | True     |
      | 3    | True     |
    And user "student3" has attempted "Quiz 1" with responses:
      | slot | response |
      | 1    | False    |
      | 2    | False    |
      | 3    | False    |
    And the following "core_question > updated questions" exist:
      | questioncategory | question   | name               |
      | Test questions   | Question A | Question updated A |
      | Test questions   | Question B | Question updated B |
      | Test questions   | Question C | Question updated C |
    And user "student1" has attempted "Quiz 1" with responses:
      | slot | response |
      | 1    | True     |
      | 2    | False    |
      | 3    | False    |
    And user "student2" has attempted "Quiz 1" with responses:
      | slot | response |
      | 1    | True     |
      | 2    | True     |
      | 3    | True     |
    And user "student3" has attempted "Quiz 1" with responses:
      | slot | response |
      | 1    | False    |
      | 2    | False    |
      | 3    | False    |
    When I am on the "Quiz 1" "mod_quiz > Statistics report" page logged in as teacher1
    # Highest grade attempts
    # Question A statistics breakdown.
    Then "1" row "Q#" column of "questionstatistics" table should contain "1"
    And "1" row "Question name" column of "questionstatistics" table should contain "Question updated A"
    And "1" row "Attempts" column of "questionstatistics" table should contain "3"
    And "1" row "Facility index" column of "questionstatistics" table should contain "66.67%"
    And "1" row "Standard deviation" column of "questionstatistics" table should contain "57.74%"
    And "1" row "Random guess score" column of "questionstatistics" table should contain "50.00%"
    And "1" row "Intended weight" column of "questionstatistics" table should contain "33.33%"
    And "1" row "Effective weight" column of "questionstatistics" table should contain "30.90%"
    And "1" row "Discrimination index" column of "questionstatistics" table should contain "50.00%"
    And I follow "View details"
    # Question A statistics breakdown.
    And "1" row "Q#" column of "questionstatistics" table should contain "1"
    And "1" row "Question name" column of "questionstatistics" table should contain "Question updated A"
    And "1" row "Attempts" column of "questionstatistics" table should contain "3"
    And "1" row "Facility index" column of "questionstatistics" table should contain "66.67%"
    And "1" row "Standard deviation" column of "questionstatistics" table should contain "57.74%"
    And "1" row "Random guess score" column of "questionstatistics" table should contain "50.00%"
    And "1" row "Intended weight" column of "questionstatistics" table should contain "33.33%"
    And "1" row "Effective weight" column of "questionstatistics" table should contain "30.90%"
    And "1" row "Discrimination index" column of "questionstatistics" table should contain "50.00%"
    And "1.1" row "Question name" column of "questionstatistics" table should contain "Question A"
    And I am on the "Quiz 1" "mod_quiz > Statistics report" page logged in as teacher1
    And I set the field "Calculate statistics from" to "all attempts"
    And I press "Show report"
    # All attempts
    # Question A statistics breakdown.
    Then "1" row "Q#" column of "questionstatistics" table should contain "1"
    And "1" row "Question name" column of "questionstatistics" table should contain "Question updated A"
    And "1" row "Attempts" column of "questionstatistics" table should contain "6"
    And "1" row "Facility index" column of "questionstatistics" table should contain "66.67%"
    And "1" row "Standard deviation" column of "questionstatistics" table should contain "51.64%"
    And "1" row "Random guess score" column of "questionstatistics" table should contain "50.00%"
    And "1" row "Intended weight" column of "questionstatistics" table should contain "33.33%"
    And "1" row "Effective weight" column of "questionstatistics" table should contain "30.90%"
    And "1" row "Discrimination index" column of "questionstatistics" table should contain "50.00%"
    And I follow "View details"
      # Question A statistics breakdown.
    And "1" row "Q#" column of "questionstatistics" table should contain "1"
    And "1" row "Question name" column of "questionstatistics" table should contain "Question updated A"
    And "1" row "Attempts" column of "questionstatistics" table should contain "6"
    And "1" row "Facility index" column of "questionstatistics" table should contain "66.67%"
    And "1" row "Standard deviation" column of "questionstatistics" table should contain "51.64%"
    And "1" row "Random guess score" column of "questionstatistics" table should contain "50.00%"
    And "1" row "Intended weight" column of "questionstatistics" table should contain "33.33%"
    And "1" row "Effective weight" column of "questionstatistics" table should contain "30.90%"
    And "1" row "Discrimination index" column of "questionstatistics" table should contain "50.00%"
    And "1.1" row "Question name" column of "questionstatistics" table should contain "Question A"
    And "1.2" row "Question name" column of "questionstatistics" table should contain "Question updated A"

  @javascript
  Scenario: Report with random question with multiple versions.
    Given the following "questions" exist:
      | questioncategory | qtype       | template    | name            | questiontext |
      | Test questions   | multichoice | one_of_four | Test question 1 |              |
    And quiz "Quiz 1" contains the following questions:
      | question                | page | randomcategory |
      | Random (Test questions) | 1    | Test questions |
    And user "student1" has attempted "Quiz 1" with responses:
      | slot | response |
      | 1    | One      |
    And the following "core_question > updated questions" exist:
      | questioncategory | question        | name               |
      | Test questions   | Test question 1 | Question updated 1 |
    And user "student1" has attempted "Quiz 1" with responses:
      | slot | response |
      | 1    | One      |
    When I am on the "Quiz 1" "mod_quiz > Statistics report" page logged in as teacher1
    And I set the field "Calculate statistics from" to "all attempts"
    And I press "Show report"
    Then "1" row "Q#" column of "questionstatistics" table should contain "1"
    And "1" row "Question name" column of "questionstatistics" table should contain "Random question"
    And "1" row "Attempts" column of "questionstatistics" table should contain "2"
    And I follow "View details"
    And I should see "Structural analysis for question number 1"
    And "1" row "Question name" column of "questionstatistics" table should contain "Random question"
    And "1" row "Attempts" column of "questionstatistics" table should contain "2"
    And "1.1" row "Attempts" column of "questionstatistics" table should contain "1"
    And "1.1" row "Question name" column of "questionstatistics" table should contain "Test question 1"
    And "1.2" row "Attempts" column of "questionstatistics" table should contain "1"
    And "1.2" row "Question name" column of "questionstatistics" table should contain "Question updated 1"
