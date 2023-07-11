package org.texttechnologylab.annotator.projects.toxicgames.resource;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.metrics.MetricUnits;
import org.eclipse.microprofile.metrics.annotation.Counted;
import org.eclipse.microprofile.metrics.annotation.Timed;
import org.texttechnologylab.annotator.projects.toxicgames.model.Annotation;
import org.texttechnologylab.annotator.projects.toxicgames.model.Annotator;
import org.texttechnologylab.annotator.projects.toxicgames.model.ToxicGame;
import org.texttechnologylab.annotator.projects.toxicgames.reqres.AnnotateRequest;
import org.texttechnologylab.annotator.projects.toxicgames.reqres.AnnotateResponse;
import org.texttechnologylab.annotator.projects.toxicgames.reqres.GameNextRequest;
import org.texttechnologylab.annotator.projects.toxicgames.reqres.GameNextResponse;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Path("/api/v1/toxic_games")
public class ToxicGamesResource {
    @POST
    @Path("/next")
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_JSON)
    @Counted(name = "gamesListCount", description = "How many times list games has been called.")
    @Timed(name = "gamesListTimer", description = "A measure of how long it takes to list all games.", unit = MetricUnits.MILLISECONDS)
    public GameNextResponse nextGames(GameNextRequest request) {
        // TODO Auswahlslogik hinzufügen, siehe dazu auch die anderen Tools als Beispiele

        // Get next game and return chat log
        ToxicGame next = ToxicGame.findAll().firstResult();
        if (next == null) {
            return null;
        }

        if (next.log.containsKey("chat")) {
            GameNextResponse response = new GameNextResponse();
            response.annotator = request.annotator;
            response.gameId = next.id;
            response.messages = (List<Map<String, Object>>) next.log.get("chat");
            return response;
        }

        return null;
    }

    @POST
    @Path("annotate")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Counted(name = "annotationAnnotateCount", description = "How many times annotation has been called.")
    @Timed(name = "annotationAnnotateTimer", description = "A measure of how long it takes to annotate.", unit = MetricUnits.MILLISECONDS)
    public AnnotateResponse annotate(@NotNull @Valid final AnnotateRequest request) {
        LocalDateTime now = LocalDateTime.now();

        AnnotateResponse response = new AnnotateResponse();
        response.status = true;

        // Find annotator or create new one
        Annotator annotator = Annotator.findByName(request.annotator);
        if (annotator == null) {
            annotator = new Annotator();
            annotator.name = request.annotator;
            annotator.annotations = new HashMap<>();
        }

        Annotation annotation = new Annotation();
        annotation.updatedAt = now;

        // update existing
        Annotation existingAnnotation = null;
        if (annotator.annotations.containsKey(request.game_id)) {
            existingAnnotation = annotator.annotations.get(request.game_id);
        }
        if (existingAnnotation == null) {
            annotation.createdAt = now;
        } else {
            annotation.createdAt = existingAnnotation.createdAt;
        }

        annotation.messages = request.annotation;

        annotator.annotations.put(request.game_id, annotation);
        annotator.persistOrUpdate();

        return response;
    }
}
