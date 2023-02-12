import { Exam } from 'app/entities/exam.model';
import { CypressExamBuilder, convertCourseAfterMultiPart } from '../../support/requests/CourseManagementRequests';
import { artemis } from '../../support/ArtemisTesting';
import dayjs from 'dayjs/esm';
import submission from '../../fixtures/programming_exercise_submissions/all_successful/submission.json';
import { Course } from 'app/entities/course.model';
import { generateUUID } from '../../support/utils';
import { EXERCISE_TYPE } from '../../support/constants';
import { AdditionalData, Exercise } from 'src/test/cypress/support/pageobjects/exam/ExamParticipation';
import { Interception } from 'cypress/types/net-stubbing';

// User management
const users = artemis.users;
const admin = users.getAdmin();
const instructor = users.getInstructor();

// Requests
const courseManagementRequests = artemis.requests.courseManagement;

// PageObjects
const examManagement = artemis.pageobjects.exam.management;
const examTestRun = artemis.pageobjects.exam.testRun;
const examParticipation = artemis.pageobjects.exam.participation;
const exerciseGroupCreation = artemis.pageobjects.exam.exerciseGroupCreation;

// Common primitives
const textFixture = 'loremIpsum.txt';
const examTitle = 'exam' + generateUUID();

const exerciseArray: Array<Exercise> = [];

describe('Exam test run', () => {
    let course: Course;
    let exam: Exam;
    let testRun: any;

    before(() => {
        cy.login(admin);
        courseManagementRequests.createCourse(true).then((response) => {
            course = convertCourseAfterMultiPart(response);
            const examContent = new CypressExamBuilder(course)
                .title(examTitle)
                .visibleDate(dayjs().subtract(3, 'days'))
                .startDate(dayjs().add(1, 'days'))
                .endDate(dayjs().add(3, 'days'))
                .examMaxPoints(40)
                .numberOfExercises(4)
                .build();
            courseManagementRequests.createExam(examContent).then((examResponse) => {
                exam = examResponse.body;
                addGroupWithExercise(exam, EXERCISE_TYPE.Text, { textFixture });

                addGroupWithExercise(exam, EXERCISE_TYPE.Programming, { submission });

                addGroupWithExercise(exam, EXERCISE_TYPE.Quiz, { quizExerciseID: 0 });

                addGroupWithExercise(exam, EXERCISE_TYPE.Modeling);
            });
        });
    });

    beforeEach('Create test run instance', () => {
        cy.login(instructor);
        // API call does not work yet, for now we use the UI to create the test run
        // courseManagementRequests.createExamTestRun(exam, exerciseArray).then((response: any) => {
        //     testRun = response.body;
        // });
        cy.visit(`/course-management/${course.id}/exams/${exam.id}`);
        examManagement.openTestRun();
        examTestRun.createTestRun();
        examTestRun.confirmTestRun().then((testRunResponse: Interception) => {
            testRun = testRunResponse.response!.body;
        });
    });

    it('Create a test run', () => {
        cy.login(instructor);

        let testRunID: number;
        const minutes = 40;
        const seconds = 30;

        cy.visit(`/course-management/${course.id}/exams/${exam.id}`);
        examManagement.openTestRun();
        examTestRun.createTestRun();
        examTestRun.setWorkingTimeMinutes(minutes);
        examTestRun.setWorkingTimeSeconds(seconds);
        examTestRun.confirmTestRun().then((testRunResponse: Interception) => {
            const testRun = testRunResponse.response!.body;
            testRunID = testRun.id;

            expect(testRunResponse.response!.statusCode).to.eq(200);
            expect(testRun.testRun).to.eq(true);
            expect(testRun.submitted).to.eq(false);
            expect(testRun.workingTime).to.eq(minutes * 60 + seconds);

            examTestRun.getWorkingTime(testRunID).contains('40min 30s');
            examTestRun.getStarted(testRunID).contains('No');
            examTestRun.getSubmitted(testRunID).contains('No');
        });
    });

    it('Change test run working time', () => {
        const hour = 1;
        const minutes = 20;
        const seconds = 45;

        cy.login(instructor);
        examTestRun.openTestRunPage(course, exam);
        examTestRun.changeWorkingTime(testRun.id);
        examTestRun.setWorkingTimeHours(hour);
        examTestRun.setWorkingTimeMinutes(minutes);
        examTestRun.setWorkingTimeSeconds(seconds);
        examTestRun.saveTestRun().then((testRunResponse: Interception) => {
            const testRun = testRunResponse.response!.body;

            expect(testRun.id).to.eq(testRun.id);
            expect(testRunResponse.response!.statusCode).to.eq(200);
            expect(testRun.workingTime).to.eq(hour * 3600 + minutes * 60 + seconds);

            examTestRun.openTestRunPage(course, exam);
            examTestRun.getWorkingTime(testRun.id).contains(`${hour}h ${minutes}min ${seconds}s`);
            examTestRun.getStarted(testRun.id).contains('No');
            examTestRun.getSubmitted(testRun.id).contains('No');
        });
    });

    it('Conducts a test run', () => {
        examTestRun.startParticipation(instructor, course, exam, testRun.id);
        cy.get('#testRunRibbon').contains('Test Run');

        for (let j = 0; j < exerciseArray.length; j++) {
            const exercise = exerciseArray[j];
            examParticipation.openExercise(j);
            examParticipation.makeSubmission(exercise.id, exercise.type, exercise.additionalData);
        }
        examParticipation.handInEarly();
        for (let j = 0; j < exerciseArray.length; j++) {
            const exercise = exerciseArray[j];
            examParticipation.verifyExerciseTitleOnFinalPage(exercise.id, exercise.title);
            if (exercise.type === EXERCISE_TYPE.Text) {
                examParticipation.verifyTextExerciseOnFinalPage(exercise.additionalData!.textFixture!);
            }
        }
        examParticipation.checkExamTitle(examTitle);
        examTestRun.openTestRunPage(course, exam);
        examTestRun.getStarted(testRun.id).contains('Yes');
        examTestRun.getSubmitted(testRun.id).contains('Yes');
    });

    it('Deletes a test run', () => {
        cy.login(instructor);
        examTestRun.openTestRunPage(course, exam);
        examTestRun.getTestRunIdElement(testRun.id).should('exist');
        examTestRun.deleteTestRun(testRun.id);
        examTestRun.getTestRun(testRun.id).should('not.exist');
    });

    after(() => {
        if (course) {
            cy.login(admin);
            courseManagementRequests.deleteCourse(course.id!);
        }
    });
});

function addGroupWithExercise(exam: Exam, exerciseType: EXERCISE_TYPE, additionalData?: AdditionalData) {
    exerciseGroupCreation.addGroupWithExercise(exam, 'Exercise ' + generateUUID(), exerciseType, (response) => {
        if (exerciseType == EXERCISE_TYPE.Quiz) {
            additionalData!.quizExerciseID = response.body.quizQuestions![0].id;
        }
        addExerciseToArray(exerciseArray, exerciseType, response, additionalData);
    });
}

function addExerciseToArray(exerciseArray: Array<Exercise>, type: EXERCISE_TYPE, response: any, additionalData?: AdditionalData) {
    exerciseArray.push({ ...response.body, additionalData });
}
