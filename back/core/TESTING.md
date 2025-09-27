# Testing Instructions

This document provides instructions for running the unit and integration tests for the EduFocus project.

## Running the Tests

To run the tests, navigate to the `core` directory and run the following command:

```bash
python manage.py test
```

This command will discover and run all the tests in the project.

## Interpreting the Results

The test results will be displayed in the console. A successful test run will look something like this:

```
Creating test database for alias 'default'...
System check identified no issues (0 silenced).
......................................................................
----------------------------------------------------------------------
Ran 70 tests in 0.123s

OK
Destroying test database for alias 'default'...
```

If there are any failures, they will be detailed in the console, including the traceback for the failing test. This information can be used to debug the issue.

## Test Coverage

To check the test coverage, you can use the `coverage` package. First, install it:

```bash
pip install coverage
```

Then, run the tests with coverage:

```bash
coverage run --source='.' manage.py test
```

Finally, generate the coverage report:

```bash
coverage report -m
```

This will show you the test coverage for each file in the project.
