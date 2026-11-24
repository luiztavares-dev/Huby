package com.example.loginsimples;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ProcurandoEquipeRepository extends MongoRepository<ProcurandoEquipe, String> {

    List<ProcurandoEquipe> findByEventoIdOrderByAtualizadoEmDesc(String eventoId);

    Optional<ProcurandoEquipe> findByEventoIdAndUsuarioId(String eventoId, String usuarioId);

    void deleteByEventoIdAndUsuarioId(String eventoId, String usuarioId);
}
