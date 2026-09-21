package com.incometax.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String DESCRIPTION =
            "Income Tax and GST return preparation APIs for the customer and admin portals. "
            + "The platform prepares and computes returns; official submission to government systems happens "
            + "through configured integration adapters or a recorded manual filing workflow.";

    @Bean
    public OpenAPI taxPlatformOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("TaxFilr Platform API")
                        .version("2.0.0")
                        .description(DESCRIPTION)
                        .license(new License().name("MIT")))
                .components(new Components().addSecuritySchemes("bearerAuth",
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
