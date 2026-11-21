package com.example.loginsimples;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface EquipeRepository extends MongoRepository<Equipe, String> {

    List<Equipe> findByEventoIdOrderByCriadoEmDesc(String eventoId);

    boolean existsByEventoIdAndNomeIgnoreCase(String eventoId, String nome);
}
