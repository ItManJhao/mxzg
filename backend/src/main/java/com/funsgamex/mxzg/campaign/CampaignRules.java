package com.funsgamex.mxzg.campaign;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/** Versioned basic-attack rules. Content is projected from the retained game tables. */
@Component
public class CampaignRules {
    public record Hero(int templateId, int star, String name, int hp, int atk, int def, int spd) {}
    public record Enemy(int templateId, int star, int level, int position) {}
    public record Reward(int itemId, long quantity) {}
    public record Stage(int id, List<Enemy> enemies, List<Reward> rewards) {}
    public record Data(String version, List<Integer> starters, List<Hero> heroes, List<Stage> stages) {}
    private final Data data;
    private final Map<String,Hero> heroes;
    private final Map<Integer,Stage> stages;
    public CampaignRules(ObjectMapper json) {
        try (var input = CampaignRules.class.getResourceAsStream("/gameplay/campaign-rules.json")) {
            if (input == null) throw new IllegalStateException("Campaign rules missing");
            data = json.readValue(input, Data.class);
        } catch (java.io.IOException error) { throw new IllegalStateException(error); }
        heroes = data.heroes().stream().collect(Collectors.toUnmodifiableMap(hero -> hero.templateId()+":"+hero.star(), Function.identity()));
        stages = data.stages().stream().collect(Collectors.toUnmodifiableMap(Stage::id, Function.identity()));
    }
    public String version() { return data.version(); }
    public List<Integer> starters() { return data.starters(); }
    public Hero hero(int id, int star) {
        var hero=heroes.get(id+":"+star);
        if(hero==null) throw new IllegalArgumentException("Hero template missing: "+id+":"+star);
        return hero;
    }
    public Stage stage(int id) { return stages.get(id); }
}
