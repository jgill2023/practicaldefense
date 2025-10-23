import React from 'react';
import { useForm } from 'react-hook-form';

import styles from './course-forms-management.module.css';

export const CourseFormsManagement = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data) => console.log(data);

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <div className={styles.inputContainer}>
        <label htmlFor="courseName">Course Name</label>
        <input
          id="courseName"
          type="text"
          {...register('courseName', { required: 'Course name is required' })}
        />
        {errors.courseName && <p className={styles.error}>{errors.courseName.message}</p>}
      </div>

      <div className={styles.inputContainer}>
        <label htmlFor="courseCode">Course Code</label>
        <input
          id="courseCode"
          type="text"
          {...register('courseCode', { required: 'Course code is required' })}
        />
        {errors.courseCode && <p className={styles.error}>{errors.courseCode.message}</p>}
      </div>

      <div className={styles.inputContainer}>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          {...register('description')}
        />
      </div>

      <div className={styles.inputContainer}>
        <label htmlFor="credits">Credits</label>
        <input
          id="credits"
          type="number"
          {...register('credits', {
            required: 'Credits are required',
            min: { value: 1, message: 'Minimum credits is 1' },
            max: { value: 5, message: 'Maximum credits is 5' },
          })}
        />
        {errors.credits && <p className={styles.error}>{errors.credits.message}</p>}
      </div>

      <div className={styles.inputContainer}>
        <label htmlFor="instructorName">Instructor Name</label>
        <input
          id="instructorName"
          type="text"
          {...register('instructorName', { required: 'Instructor name is required' })}
        />
        {errors.instructorName && <p className={styles.error}>{errors.instructorName.message}</p>}
      </div>

      <div className={styles.inputContainer}>
        <label htmlFor="instructorEmail">Instructor Email</label>
        <input
          id="instructorEmail"
          type="email"
          {...register('instructorEmail', {
            required: 'Instructor email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i,
              message: 'Invalid email address',
            },
          })}
        />
        {errors.instructorEmail && <p className={styles.error}>{errors.instructorEmail.message}</p>}
      </div>

      <button type="submit" className={styles.button}>Add Course</button>
    </form>
  );
};

export default CourseFormsManagement;