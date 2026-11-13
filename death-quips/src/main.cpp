#include <Geode/Geode.hpp>
#include <Geode/modify/PlayLayer.hpp>

#include "Quips.hpp"

using namespace geode::prelude;

namespace {
    constexpr float POP_IN = 0.25f;
    constexpr float FADE_OUT = 0.35f;

    ccColor3B colorFor(quips::Tier tier) {
        switch (tier) {
            case quips::Tier::NewBest: return {255, 215, 80};
            case quips::Tier::Choke: return {255, 95, 95};
            case quips::Tier::Late: return {255, 175, 90};
            default: return {255, 255, 255};
        }
    }
}

class $modify(QuipPlayLayer, PlayLayer) {
    struct Fields {
        // destroyPlayer can run more than once for a single death, so only the first call shows a quip.
        bool m_quipShown = false;
    };

    void resetLevel() {
        PlayLayer::resetLevel();
        m_fields->m_quipShown = false;
    }

    void destroyPlayer(PlayerObject* player, GameObject* object) {
        // Read before the original runs, because it saves the new best.
        int previousBest = m_level ? m_level->m_normalPercent.value() : 0;

        PlayLayer::destroyPlayer(player, object);

        // On load the game kills the player with a hidden spike as an anticheat check.
        if (object == m_anticheatSpike) return;
        // Still alive means another mod (noclip) cancelled the death.
        if (!player || !player->m_isDead) return;
        if (m_fields->m_quipShown) return;
        m_fields->m_quipShown = true;

        auto mod = Mod::get();
        if (!mod->getSettingValue<bool>("enabled")) return;

        quips::Death death;
        death.percent = this->getCurrentPercentInt();
        death.attempt = m_attempts;
        death.platformer = m_level && m_level->isPlatformer();
        death.practice = m_isPracticeMode;
        death.newBest = !death.platformer && !death.practice && !m_isTestMode && death.percent > previousBest;

        if (death.practice && !mod->getSettingValue<bool>("practice-mode")) return;
        if (!death.platformer && death.percent < mod->getSettingValue<int64_t>("min-percent")) return;

        auto custom = quips::parseCustom(mod->getSettingValue<std::string>("custom-quips"));
        auto line = quips::pick(death, custom, mod->getSettingValue<bool>("only-custom"));

        std::string stats;
        if (mod->getSettingValue<bool>("show-stats")) {
            stats = death.platformer
                ? fmt::format("Attempt {}", death.attempt)
                : fmt::format("Attempt {} - {}%", death.attempt, death.percent);
        }

        this->showQuip(line, stats, colorFor(quips::tierFor(death)));
    }

    void showQuip(std::string const& line, std::string const& stats, ccColor3B color) {
        if (auto old = this->getChildByID("quip"_spr)) old->removeFromParent();

        auto mod = Mod::get();
        auto scale = static_cast<float>(mod->getSettingValue<double>("scale"));
        auto duration = static_cast<float>(mod->getSettingValue<double>("duration"));
        auto winSize = CCDirector::get()->getWinSize();

        auto container = CCNode::create();
        container->setID("quip"_spr);
        container->setPosition({winSize.width / 2, winSize.height * 0.78f});
        container->setScale(0.f);

        auto label = CCLabelBMFont::create(line.c_str(), "bigFont.fnt");
        label->setColor(color);
        label->limitLabelWidth(winSize.width - 60.f, scale, 0.1f);
        label->runAction(CCSequence::create(
            CCDelayTime::create(duration), CCFadeTo::create(FADE_OUT, 0), nullptr
        ));
        container->addChild(label);

        if (!stats.empty()) {
            auto statsLabel = CCLabelBMFont::create(stats.c_str(), "bigFont.fnt");
            statsLabel->setScale(scale * 0.45f);
            statsLabel->setOpacity(190);
            statsLabel->setPositionY(-label->getScaledContentSize().height / 2 - 7.f * scale / 0.6f);
            statsLabel->runAction(CCSequence::create(
                CCDelayTime::create(duration), CCFadeTo::create(FADE_OUT, 0), nullptr
            ));
            container->addChild(statsLabel);
        }

        // The container removes itself at the moment the labels finish fading.
        container->runAction(CCSequence::create(
            CCEaseBackOut::create(CCScaleTo::create(POP_IN, 1.f)),
            CCDelayTime::create(duration + FADE_OUT - POP_IN),
            CCRemoveSelf::create(),
            nullptr
        ));

        this->addChild(container, 1000);
    }
};
