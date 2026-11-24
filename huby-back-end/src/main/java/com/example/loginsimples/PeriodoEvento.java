package com.example.loginsimples;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** Regras centrais de inscrição, desenvolvimento e revelação do tema. */
public final class PeriodoEvento {

    private PeriodoEvento() {
    }

    public static LocalDateTime inicioInscricoes(Conteudo evento) {
        return evento.getInscricoesInicio();
    }

    public static LocalDateTime fimInscricoes(Conteudo evento) {
        if (evento.getInscricoesFim() != null) return evento.getInscricoesFim();
        if (evento.getInscricoesAte() != null) {
            return evento.getInscricoesAte().atTime(LocalTime.MAX);
        }
        if (evento.getDesenvolvimentoInicio() != null) return evento.getDesenvolvimentoInicio();
        if (evento.getDataInicio() != null) return evento.getDataInicio().atTime(LocalTime.MAX);
        return null;
    }

    public static boolean inscricoesAbertas(Conteudo evento) {
        LocalDateTime agora = LocalDateTime.now();
        LocalDateTime inicio = inicioInscricoes(evento);
        LocalDateTime fim = fimInscricoes(evento);
        if (inicio != null && agora.isBefore(inicio)) return false;
        return fim == null || !agora.isAfter(fim);
    }

    public static void validarInscricoes(Conteudo evento) {
        LocalDateTime agora = LocalDateTime.now();
        LocalDateTime inicio = inicioInscricoes(evento);
        LocalDateTime fim = fimInscricoes(evento);

        if (inicio != null && agora.isBefore(inicio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O período de inscrição deste evento ainda não começou.");
        }
        if (fim != null && agora.isAfter(fim)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O prazo de inscrição deste evento terminou.");
        }
    }

    public static boolean temaRevelado(Conteudo evento) {
        LocalDateTime fim = fimInscricoes(evento);
        return fim == null || LocalDateTime.now().isAfter(fim);
    }

    public static LocalDateTime inicioDesenvolvimento(Conteudo evento) {
        if (evento.getDesenvolvimentoInicio() != null) return evento.getDesenvolvimentoInicio();
        return evento.getDataInicio() == null ? null : evento.getDataInicio().atStartOfDay();
    }

    public static LocalDateTime fimDesenvolvimento(Conteudo evento) {
        if (evento.getDesenvolvimentoFim() != null) return evento.getDesenvolvimentoFim();
        return evento.getDataFim() == null ? null : evento.getDataFim().atTime(LocalTime.MAX);
    }

    public static boolean podeEnviarEntrega(Conteudo evento) {
        LocalDateTime agora = LocalDateTime.now();
        LocalDateTime inicio = inicioDesenvolvimento(evento);
        LocalDateTime fim = fimDesenvolvimento(evento);
        if (inicio == null && fim == null) return true;
        if (inicio != null && agora.isBefore(inicio)) return false;
        return fim == null || !agora.isAfter(fim);
    }

    public static void validarEntrega(Conteudo evento) {
        if (podeEnviarEntrega(evento)) return;

        LocalDateTime agora = LocalDateTime.now();
        LocalDateTime inicio = inicioDesenvolvimento(evento);
        if (inicio != null && agora.isBefore(inicio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O envio de jogos só pode ser feito durante o período de desenvolvimento.");
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "O período de desenvolvimento terminou. Não são permitidos novos envios durante a análise.");
    }

    public static LocalDate dataLegacy(LocalDateTime dataHora) {
        return dataHora == null ? null : dataHora.toLocalDate();
    }
}
