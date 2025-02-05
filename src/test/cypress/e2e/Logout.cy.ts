import { Course } from '../../../main/webapp/app/entities/course.model';
import { ModelingExercise } from '../../../main/webapp/app/entities/modeling-exercise.model';
import { courseManagementRequest, courseOverview, modelingExerciseEditor, navigationBar } from '../support/artemis';
import { convertModelAfterMultiPart } from '../support/requests/CourseManagementRequests';
import { admin, studentOne, studentTwo } from '../support/users';

describe('Logout tests', () => {
    let course: Course;
    let modelingExercise: ModelingExercise;

    before('Login as admin and create a course with a modeling exercise', () => {
        cy.login(admin);

        courseManagementRequest.createCourse(true).then((response) => {
            course = convertModelAfterMultiPart(response);
            courseManagementRequest.addStudentToCourse(course, studentOne);
            courseManagementRequest.addStudentToCourse(course, studentTwo);
            courseManagementRequest.createModelingExercise({ course }).then((resp: Cypress.Response<ModelingExercise>) => {
                modelingExercise = resp.body;
            });
        });
    });

    it('Logs out by pressing OK when unsaved changes on exercise mode', () => {
        cy.login(studentOne);

        const exerciseID = modelingExercise.id!;
        cy.visit(`/courses/${course.id}/exercises`);
        courseOverview.startExercise(exerciseID);
        courseOverview.openRunningExercise(exerciseID);
        modelingExerciseEditor.addComponentToModel(exerciseID, 1);
        modelingExerciseEditor.addComponentToModel(exerciseID, 2);
        navigationBar.logout();

        cy.on('window:confirm', (text) => {
            expect(text).to.contains('You have unsaved changes');
            return true;
        });
        cy.url().should('equal', Cypress.config().baseUrl + '/');
    });

    it('Stays logged in by pressing cancel when trying to logout during unsaved changes on exercise mode', () => {
        cy.login(studentTwo);

        const exerciseID = modelingExercise.id!;
        cy.visit(`/courses/${course.id}/exercises`);
        courseOverview.startExercise(exerciseID);
        courseOverview.openRunningExercise(exerciseID);
        modelingExerciseEditor.addComponentToModel(exerciseID, 1);
        modelingExerciseEditor.addComponentToModel(exerciseID, 2);
        navigationBar.logout();

        cy.on('window:confirm', (text) => {
            expect(text).to.contains('You have unsaved changes');
            return false;
        });
        cy.url().should('not.equal', Cypress.config().baseUrl + '/');
    });

    after(() => {
        courseManagementRequest.deleteCourse(course, admin);
    });
});
