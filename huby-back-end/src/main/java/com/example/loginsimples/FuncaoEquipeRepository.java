package com.example.loginsimples;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface FuncaoEquipeRepository extends MongoRepository<FuncaoEquipe, String> {

    List<FuncaoEquipe> findAllByOrderByOrdemAsc();

    Optional<FuncaoEquipe> findByNomeIgnoreCase(String nome);
}
