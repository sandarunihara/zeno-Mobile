package com.zeno.auth_service.exception;

import com.zeno.auth_service.dto.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // This catches ANY RuntimeException thrown in your AuthService
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex) {
        String errorMessage = ex.getMessage() == null ? ex.toString() : ex.getMessage();
        
        // If the error message is about a bad password or user not found, make it a 401 Unauthorized
        if (errorMessage.contains("Invalid password") || errorMessage.contains("User not found")) {
            ErrorResponse error = new ErrorResponse("Unauthorized", errorMessage, HttpStatus.UNAUTHORIZED.value());
            return new ResponseEntity<>(error, HttpStatus.UNAUTHORIZED);
        }

        // If the email is already taken, make it a 400 Bad Request
        if (errorMessage.contains("already registered")) {
            ErrorResponse error = new ErrorResponse("Bad Request", errorMessage, HttpStatus.BAD_REQUEST.value());
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        // For anything else, return a standard 400
        ErrorResponse error = new ErrorResponse("Error", errorMessage, HttpStatus.BAD_REQUEST.value());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }
}