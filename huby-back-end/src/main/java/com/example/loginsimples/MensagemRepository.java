package com.example.loginsimples;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.List;

public interface MensagemRepository extends MongoRepository<Mensagem, String> {

    @Query(value = "{ '$or': [ { 'remetenteId': ?0, 'destinatarioId': ?1 }, { 'remetenteId': ?1, 'destinatarioId': ?0 } ] }", sort = "{ 'dataHora': 1 }")
    List<Mensagem> findHistoricoDeConversa(String user1, String user2);

    @Query("{ '$or': [ { 'remetenteId': ?0 }, { 'destinatarioId': ?0 } ] }")
    List<Mensagem> findMinhasMensagens(String meuId);
}