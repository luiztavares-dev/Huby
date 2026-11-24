package com.example.loginsimples;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SorteioEquipeScheduler {

    private final SorteioEquipeService sorteioEquipeService;

    public SorteioEquipeScheduler(SorteioEquipeService sorteioEquipeService) {
        this.sorteioEquipeService = sorteioEquipeService;
    }

    @Scheduled(
            fixedDelayString = "${huby.sorteio.intervalo-ms:60000}",
            initialDelayString = "${huby.sorteio.initial-delay-ms:30000}"
    )
    public void sortearEquipesPendentes() {
        sorteioEquipeService.realizarSorteiosPendentes();
    }
}
