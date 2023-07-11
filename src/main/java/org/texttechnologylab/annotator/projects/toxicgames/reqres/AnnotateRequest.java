package org.texttechnologylab.annotator.projects.toxicgames.reqres;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.texttechnologylab.annotator.projects.toxicgames.model.AnnotationChoice;

import java.util.Map;

public class AnnotateRequest {
    @NotNull
    @NotBlank
    public String annotator;

    @NotBlank
    @NotBlank
    public String game_id;

    @NotNull
    @NotEmpty
    public Map<String, AnnotationChoice> annotation;
}
