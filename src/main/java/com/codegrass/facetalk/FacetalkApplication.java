package com.codegrass.facetalk;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@Slf4j
@SpringBootApplication
public class FacetalkApplication {

	public static void main(String[] args) {
		log.info("Keystore Path: {}", System.getProperty("javax.net.ssl.keyStore"));
		log.info("Keystore Password: {}", System.getProperty("javax.net.ssl.keyStorePassword"));
		log.info("Keystore Type: {}", System.getProperty("javax.net.ssl.keyStoreType"));

		SpringApplication.run(FacetalkApplication.class, args);
	}
}
