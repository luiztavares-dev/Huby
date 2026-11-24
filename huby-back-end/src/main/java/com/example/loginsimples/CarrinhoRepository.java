package com.example.loginsimples;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface CarrinhoRepository extends MongoRepository<Carrinho, String> {
    Optional<Carrinho> findByUsuarioId(String usuarioId);
}