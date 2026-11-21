package com.example.loginsimples;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/** Devolve mensagens de erro legíveis para o front-end. */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> tratar(ResponseStatusException ex) {
        String mensagem = ex.getReason() == null ? "Não foi possível concluir a operação." : ex.getReason();
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("mensagem", mensagem));
    }
}
