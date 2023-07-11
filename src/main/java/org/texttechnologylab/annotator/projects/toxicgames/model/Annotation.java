package org.texttechnologylab.annotator.projects.toxicgames.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.bson.codecs.pojo.annotations.BsonProperty;

import java.time.LocalDateTime;
import java.util.Map;

public class Annotation {
    @JsonProperty("game_id")
    public String gameId;

    @BsonProperty("created_at")
    @JsonProperty("created_at")
    public LocalDateTime createdAt;

    @BsonProperty("updated_at")
    @JsonProperty("updated_at")
    public LocalDateTime updatedAt;

    // Annotated list of messages and users
    public Map<String, AnnotationChoice> messages;
    public Map<String, AnnotationChoice> users;
}
