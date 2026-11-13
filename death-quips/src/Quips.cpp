#include "Quips.hpp"

#include <random>
#include <span>

namespace {
    using Pool = std::span<std::string_view const>;

    // Lines stick to plain ASCII so every character exists in the game's bitmap font.
    constexpr std::string_view OPENING[] = {
        "That was quick",
        "Blink and you miss it",
        "Warm-up attempt",
        "We just got here",
        "Speedrun to the restart",
        "Let's pretend that didn't happen",
    };
    constexpr std::string_view EARLY[] = {
        "Still warming up",
        "Not even halfway",
        "Long way to go",
        "Shake it off",
        "The level says hi",
        "Attempt {attempt}, same spike",
    };
    constexpr std::string_view MIDDLE[] = {
        "Past the half, at least",
        "Now we're getting somewhere",
        "That run had potential",
        "So much for that one",
        "{percent}% is respectable",
        "The hard part got you",
    };
    constexpr std::string_view LATE[] = {
        "That one hurt",
        "So close",
        "Almost had it",
        "Nerves?",
        "{percent}%. Ouch.",
        "The end was right there",
    };
    constexpr std::string_view CHOKE[] = {
        "NOOOOO",
        "Heartbreak",
        "{percent}%... really?",
        "We don't talk about this one",
        "Choke of the day",
        "Deep breath",
    };
    constexpr std::string_view NEW_BEST[] = {
        "New best! Keep pushing",
        "Further than ever",
        "Progress!",
        "{percent}% - that's a record",
        "Now do it again",
    };
    constexpr std::string_view PLATFORMER[] = {
        "Back to the checkpoint",
        "Gravity wins again",
        "Try that jump again",
        "Ouch",
        "Take your time",
        "Attempt {attempt}, here we go",
    };
    constexpr std::string_view PRACTICE[] = {
        "That's what practice is for",
        "Noted for next time",
        "Again, from the checkpoint",
        "Learning the hard way",
        "One more try",
    };

    Pool poolFor(quips::Tier tier) {
        switch (tier) {
            case quips::Tier::Opening: return OPENING;
            case quips::Tier::Early: return EARLY;
            case quips::Tier::Middle: return MIDDLE;
            case quips::Tier::Late: return LATE;
            case quips::Tier::Choke: return CHOKE;
            case quips::Tier::NewBest: return NEW_BEST;
            case quips::Tier::Platformer: return PLATFORMER;
            case quips::Tier::Practice: return PRACTICE;
        }
        return OPENING;
    }

    std::string_view trim(std::string_view text) {
        constexpr std::string_view whitespace = " \t\r\n";
        auto first = text.find_first_not_of(whitespace);
        if (first == std::string_view::npos) return {};
        auto last = text.find_last_not_of(whitespace);
        return text.substr(first, last - first + 1);
    }

    void replaceAll(std::string& text, std::string_view from, std::string_view to) {
        for (auto at = text.find(from); at != std::string::npos; at = text.find(from, at + to.size())) {
            text.replace(at, from.size(), to);
        }
    }

    std::mt19937& rng() {
        static std::mt19937 engine{std::random_device{}()};
        return engine;
    }
}

quips::Tier quips::tierFor(Death const& death) {
    if (death.practice) return Tier::Practice;
    if (death.platformer) return Tier::Platformer;
    if (death.newBest) return Tier::NewBest;
    if (death.percent >= 95) return Tier::Choke;
    if (death.percent >= 80) return Tier::Late;
    if (death.percent >= 50) return Tier::Middle;
    if (death.percent >= 10) return Tier::Early;
    return Tier::Opening;
}

std::vector<std::string> quips::parseCustom(std::string_view setting) {
    std::vector<std::string> lines;
    while (true) {
        auto bar = setting.find('|');
        if (auto line = trim(setting.substr(0, bar)); !line.empty()) {
            lines.emplace_back(line);
        }
        if (bar == std::string_view::npos) break;
        setting.remove_prefix(bar + 1);
    }
    return lines;
}

std::string quips::pick(Death const& death, std::vector<std::string> const& custom, bool onlyCustom) {
    std::vector<std::string_view> candidates;
    if (!onlyCustom || custom.empty()) {
        auto pool = poolFor(tierFor(death));
        candidates.assign(pool.begin(), pool.end());
    }
    candidates.insert(candidates.end(), custom.begin(), custom.end());

    // Avoid showing the same line twice in a row when there is anything else to show.
    static std::string previous;
    std::vector<std::string_view> fresh;
    for (auto candidate : candidates) {
        if (candidate != previous) fresh.push_back(candidate);
    }
    if (!fresh.empty()) candidates = std::move(fresh);

    std::uniform_int_distribution<size_t> index(0, candidates.size() - 1);
    std::string line(candidates[index(rng())]);
    previous = line;

    replaceAll(line, "{percent}", std::to_string(death.percent));
    replaceAll(line, "{attempt}", std::to_string(death.attempt));
    return line;
}
