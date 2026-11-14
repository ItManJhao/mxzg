/**
 * 当前保留界面的路径及 UUID 索引，由通用加载器读取。
 * 这里只登记资源身份，不注册页面、网络请求或角色状态。
 */
/** 相对 assets，不是 resources 路径。 */
export const CITY_CHROME_PREFAB_PATH = "bundles/module/home/prefabs/CityChromeView";
export const CITY_HUB_PREFAB_PATH = "bundles/module/home/prefabs/CityHubView";

/** 与 .prefab.meta 的 uuid 一致。供离线绑定检查使用；运行时按Bundle路径加载，不按UUID回退。 */
export const PREFAB_UUID: Readonly<Record<string, string>> = {
  "bundles/module/bag/prefabs/BagInfoView": "f151a2c1-a24a-4e5d-9d67-2096089cde82",
  "bundles/module/bag/prefabs/BagTabView": "d5f9b2c3-8e44-4072-ab31-7c6f1e5d9022",
  "bundles/module/bag/prefabs/BagView": "6bfdfd78-65e9-403c-b7c8-7e6cd94ffebb",
  "bundles/module/bag/prefabs/EquipmentInfoView": "bd783dbf-a60a-4e41-a616-6f8bf7d8153f",
  "bundles/module/bag/prefabs/SpiritInfoView": "0fd523fc-a296-57eb-ada9-e5b8b4c19422",
  "bundles/module/battle/prefabs/BattleDetailCell": "5292128a-6bc8-46d2-8df9-27c886761aa4",
  "bundles/module/battle/prefabs/BattleDetailLayer": "8d8bc954-91e3-4cd3-a7a3-45f6ebb12ca5",
  "bundles/module/battle/prefabs/BattlePage": "733c8611-a124-4c16-bb79-6b3011dfb408",
  "bundles/module/battle/prefabs/ChapterEndView": "87487742-8794-4b8b-824c-ef1c009cdf27",
  "bundles/module/battle/prefabs/ChapterRewardInfoCell": "fda51bbe-50ab-4c68-b475-9ad250a97b77",
  "bundles/module/battle/prefabs/ChapterRewardInfoView": "be077496-77e1-432a-a350-3929e9ad0040",
  "bundles/module/battle/prefabs/MainChapterBattleView": "5ef66168-57ea-46f9-9f46-00a8989ea797",
  "bundles/module/battle/prefabs/MainChapterView": "cc1bc0f0-28ac-4d7a-a8e5-c4bc24a4d43b",
  "bundles/module/battle/prefabs/SkillAuditCellView": "e1204782-0759-492f-b8ec-54bd381fbc83",
  "bundles/module/battle/prefabs/SkillAuditView": "34d5372d-d0b5-43b0-965f-db66c446f775",
  "bundles/module/bootstrap/prefabs/LoadingLayer": "ed70957c-0e46-44db-a4a2-aacd73196fd1",
  "bundles/module/common/prefabs/BagItemView": "c4e8a1b2-7d33-4f61-9a20-6b5e0d4c8f11",
  "bundles/module/common/prefabs/CommonPanel1": "a947bf3d-bdb0-4b1c-b9c5-30997719c343",
  "bundles/module/gm/prefabs/GmBattleView": "cc3da575-12f4-4198-9832-c68fb455475e",
  "bundles/module/gm/prefabs/GmGrantView": "bb17e366-2157-40ce-8902-96b0af1c43d9",
  "bundles/module/gm/prefabs/GmOptionCellView": "ac4b58d6-8086-44b6-9701-4997d58d6b13",
  "bundles/module/gm/prefabs/GmView": "76ebb0c2-3e4e-48b1-ae9c-291a56089c8e",
  "bundles/module/hero/prefabs/FormationHeroCellView": "a49f3984-6d14-4b45-a97c-8dc81d1ea24f",
  "bundles/module/hero/prefabs/FormationView": "c75bff2b-0944-4809-9b5f-1eb8c09107f8",
  "bundles/module/hero/prefabs/HeroIconCellView": "e7c1a4b0-6d28-4f53-9c11-2a8b7e6d5c40",
  "bundles/module/hero/prefabs/HeroInfoView": "fa5d3f0c-1441-479b-a182-48d374c7dc6c",
  "bundles/module/hero/prefabs/HeroListView": "95a097b8-9964-4ac3-8b3d-b4f568b1eb53",
  "bundles/module/hero/prefabs/HeroSkillView": "65ad86c3-aeb9-4df2-9bc5-cff830b678b0",
  "bundles/module/home/prefabs/CityChromeView": "c97efb56-db67-4c93-84d5-e29436794e86",
  "bundles/module/home/prefabs/CityHubView": "118c08f7-43eb-477d-ab62-50f3ec65294f",
  "bundles/module/home/prefabs/RemakeHomeView": "bd1203e8-e72a-5d44-bc5c-ab68a868898a",
  "bundles/module/login/prefabs/AccountLoginView": "61d32fd8-b35a-5ddc-bf5f-ea5026c8c23b",
  "bundles/module/login/prefabs/RoleProfileView": "1aedb5a3-4e33-552f-843c-c419fd8174a4",
  "bundles/module/login/prefabs/ServerCellView": "da7f5fcb-b7ea-5f0d-9d9e-bf5186dbfa68",
  "bundles/module/login/prefabs/ServerPickerView": "46c73fed-68c2-5589-8720-d11645528009",
  "bundles/module/login/prefabs/UpdateLayer": "4371fa6e-a0d2-4932-ab57-bb085d572a06"
};
